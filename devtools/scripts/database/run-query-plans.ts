import { mkdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import postgres from "postgres";
import { z } from "zod";
import {
  comparePlans,
  explainStatement,
  maxPlanRows,
  planFingerprint,
  planNodeSchema,
  readPlanResult,
  renderComparison,
  type PlanArtifact,
  type PlanEntry,
  type PlanNode,
  mapWithConcurrency,
  queryCorpusSchema,
} from "@template/db/devtools/query-plans";
import { resolveRepositoryPath } from "../shared/repository-paths.ts";

// This is an AI-facing design guard: every captured query is explained against
// A real PostgreSQL planner, then reported with a visible risk marker so query
// Shape and scale are part of the implementation feedback loop.

const relationStatisticsSchema = z.array(
  z.object({
    schema_name: z.string(),
    relation_name: z.string(),
    estimated_rows: z.number(),
  }),
);

function attachRelationSizes(
  plan: PlanNode,
  sizes: ReadonlyMap<string, number>,
): PlanNode {
  let relationRows = 0;
  if (plan["Relation Name"].length > 0) {
    const estimate = sizes.get(`${plan.Schema}.${plan["Relation Name"]}`);
    if (typeof estimate !== "number" || estimate < 0) {
      throw new Error(
        `Missing analyzed relation statistics for ${plan.Schema}.${plan["Relation Name"]}`,
      );
    }
    relationRows = estimate;
  }
  return {
    ...plan,
    "Relation Rows": relationRows,
    Plans: plan.Plans.map((child) => attachRelationSizes(child, sizes)),
  };
}

async function readArtifact(path?: string): Promise<PlanArtifact | undefined> {
  if (typeof path !== "string") {
    return path;
  }
  const planEntrySchema = z.object({
    fingerprint: z.string(),
    maxPlanRows: z.number(),
    plan: planNodeSchema,
    planFingerprint: z.string(),
    sql: z.string(),
    testSources: z.array(z.string()),
    totalCost: z.number(),
  });
  const planArtifactSchema = z.object({
    databaseVersion: z.string(),
    queries: z.array(planEntrySchema),
    version: z.literal(1),
  });
  try {
    const document: unknown = JSON.parse(
      await readFile(resolveRepositoryPath(path), "utf8"),
    );
    return planArtifactSchema.parse(document);
  } catch (error) {
    throw new TypeError(`Plan artifact is invalid: ${path}`, { cause: error });
  }
}

const databaseUrl = process.env.QUERY_PLAN_DATABASE_URL;
const corpusPath = resolveRepositoryPath(
  process.env.QUERY_PLAN_CORPUS ?? ".artifacts/query-corpus.json",
);
const artifactPath = resolveRepositoryPath(
  process.env.QUERY_PLAN_ARTIFACT ?? ".artifacts/query-plans.json",
);
const baseline = await readArtifact(process.env.QUERY_PLAN_BASELINE);
const outputPath = resolveRepositoryPath(
  process.env.QUERY_PLAN_OUTPUT ?? ".artifacts/query-plans.md",
);
if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
  throw new TypeError("QUERY_PLAN_DATABASE_URL is required");
}

const corpus = queryCorpusSchema.parse(JSON.parse(await readFile(corpusPath, "utf8")));
if (corpus.queries.length === 0) {
  throw new TypeError("The captured query corpus is empty");
}
const sql = postgres(databaseUrl, { max: 1, prepare: false });
const planEntries: PlanEntry[] = [];
let databaseVersion = "unknown";
try {
  const versionRows: readonly unknown[] = await sql.unsafe(
    "SELECT current_setting('server_version') AS version",
  );
  const [versionRow] = versionRows;
  const databaseVersionRow = z.object({ version: z.string() }).safeParse(versionRow);
  if (databaseVersionRow.success) {
    databaseVersion = databaseVersionRow.data.version;
  }
  const statistics: readonly unknown[] = await sql`
    SELECT n.nspname AS schema_name, c.relname AS relation_name,
      c.reltuples::float8 AS estimated_rows
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p')
  `;
  const sizes = new Map(
    relationStatisticsSchema
      .parse(statistics)
      .map((row) => [`${row.schema_name}.${row.relation_name}`, row.estimated_rows]),
  );
  const explainedEntries = await mapWithConcurrency(
    corpus.queries,
    1,
    async (query): Promise<PlanEntry> => {
      const rows: readonly unknown[] = await sql.unsafe(explainStatement(query.sql));
      const plan = attachRelationSizes(readPlanResult(rows), sizes);
      return {
        fingerprint: query.fingerprint,
        maxPlanRows: maxPlanRows(plan),
        plan,
        planFingerprint: planFingerprint(plan),
        sql: query.sql,
        testSources: query.testSources,
        totalCost: plan["Total Cost"],
      };
    },
  );
  planEntries.push(...explainedEntries);
} finally {
  await sql.end({ timeout: 5 });
}

const current: PlanArtifact = { databaseVersion, queries: planEntries, version: 1 };
await mkdir(nodePath.dirname(artifactPath), { recursive: true });
await mkdir(nodePath.dirname(outputPath), { recursive: true });
const currentJson = `${JSON.stringify(current, (_key: string, value: unknown): unknown => value, 2)}\n`;
await writeFile(artifactPath, currentJson, "utf8");
const comparison = comparePlans(current, baseline);
await writeFile(outputPath, renderComparison(comparison), "utf8");
if (comparison.violations.length > 0) {
  process.exitCode = 1;
}
