import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import postgres from "postgres";
import { z } from "zod";
import { queryCorpusSchema } from "../src/devtools/query-plans.js";

// This is an AI-facing design guard: every captured query is explained against
// A real PostgreSQL planner, then reported with a visible risk marker so query
// Shape and scale are part of the implementation feedback loop.

const repositoryRoot = nodePath.resolve(import.meta.dirname, "../../..");

function repositoryPath(relativePath: string): string {
  return nodePath.resolve(repositoryRoot, relativePath);
}

interface PlanNode {
  readonly "Index Name": string;
  readonly "Node Type": string;
  readonly "Plan Rows": number;
  readonly Plans: readonly PlanNode[];
  readonly "Relation Name": string;
  readonly "Total Cost": number;
}

const planNodeSchema: z.ZodType<PlanNode> = z.lazy(() =>
  z.looseObject({
    "Index Name": z.string().default(""),
    "Node Type": z.string(),
    "Plan Rows": z.number().default(0),
    Plans: z.array(planNodeSchema).default([]),
    "Relation Name": z.string().default(""),
    "Total Cost": z.number().default(0),
  }),
);

interface PlanEntry {
  readonly fingerprint: string;
  readonly plan: PlanNode;
  readonly planFingerprint: string;
  readonly sql: string;
  readonly testSources: readonly string[];
  readonly totalCost: number;
  readonly maxPlanRows: number;
}

interface PlanArtifact {
  readonly databaseVersion: string;
  readonly queries: readonly PlanEntry[];
  readonly version: 1;
}

interface PlanComparison {
  readonly added: readonly PlanEntry[];
  readonly changed: readonly PlanEntry[];
  readonly riskByFingerprint: ReadonlyMap<string, string>;
  readonly violations: readonly string[];
  readonly unchanged: readonly PlanEntry[];
}

function jsonIdentity(_key: string, replacementValue: unknown): unknown {
  return replacementValue;
}

function planFingerprint(node: PlanNode): string {
  const shape = JSON.stringify({
    index: node["Index Name"],
    node: node["Node Type"],
    relation: node["Relation Name"],
    plans: node.Plans.map((childPlan) => planFingerprint(childPlan)),
  });
  return createHash("sha256").update(shape).digest("hex");
}

function maxPlanRows(node: PlanNode): number {
  return Math.max(
    node["Plan Rows"],
    ...node.Plans.map((childPlan) => maxPlanRows(childPlan)),
  );
}

function hasLargeSequentialScan(node: PlanNode): boolean {
  if (node["Node Type"] === "Seq Scan" && node["Plan Rows"] > 10_000) {
    return true;
  }
  return node.Plans.some((childPlan) => hasLargeSequentialScan(childPlan));
}

function hasSequentialScan(node: PlanNode): boolean {
  if (node["Node Type"] === "Seq Scan") {
    return true;
  }
  return node.Plans.some((childPlan) => hasSequentialScan(childPlan));
}

function riskForPlan(entry: PlanEntry, previous?: PlanEntry): string {
  if (
    hasLargeSequentialScan(entry.plan) ||
    entry.totalCost > 100_000 ||
    (previous && entry.totalCost > previous.totalCost * 2 + 100)
  ) {
    return "🔴 high";
  }
  if (
    hasSequentialScan(entry.plan) ||
    entry.totalCost > 10_000 ||
    (previous && previous.planFingerprint !== entry.planFingerprint)
  ) {
    return "🟠 review";
  }
  return "✅ low";
}

function explainStatement(sql: string): string {
  const statement = sql.trim().replace(/;$/u, "");
  if (statement.includes(";")) {
    throw new TypeError("Query corpus SQL cannot contain multiple statements");
  }
  return `EXPLAIN (FORMAT JSON, GENERIC_PLAN TRUE) ${statement}`;
}

function readPlanResult(rows: readonly unknown[]): PlanNode {
  const [row] = rows;
  const explainRow = z
    .object({ "QUERY PLAN": z.array(z.object({ Plan: planNodeSchema })) })
    .safeParse(row);
  if (!explainRow.success) {
    throw new TypeError("PostgreSQL returned no JSON query plan");
  }
  const [document] = explainRow.data["QUERY PLAN"];
  if (!document) {
    throw new TypeError("PostgreSQL returned no JSON query plan");
  }
  return document.Plan;
}

async function readArtifact(path: string): Promise<PlanArtifact> {
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
    const document: unknown = JSON.parse(await readFile(path, "utf8"));
    return planArtifactSchema.parse(document);
  } catch (error) {
    throw new TypeError(`Plan artifact is invalid: ${path}`, { cause: error });
  }
}

function comparePlans(current: PlanArtifact, baseline: PlanArtifact): PlanComparison {
  const baselineByFingerprint = new Map(
    baseline.queries.map((entry) => [entry.fingerprint, entry]),
  );
  const added: PlanEntry[] = [];
  const changed: PlanEntry[] = [];
  const unchanged: PlanEntry[] = [];
  const riskByFingerprint = new Map<string, string>();
  const violations: string[] = [];
  for (const entry of current.queries) {
    const previous = baselineByFingerprint.get(entry.fingerprint);
    if (!previous) {
      added.push(entry);
    } else if (previous.planFingerprint === entry.planFingerprint) {
      unchanged.push(entry);
    } else {
      changed.push(entry);
    }
    riskByFingerprint.set(entry.fingerprint, riskForPlan(entry, previous));
    if (hasLargeSequentialScan(entry.plan)) {
      violations.push(
        `${entry.fingerprint}: sequential scan exceeds 10,000 estimated rows`,
      );
    }
    if (previous && entry.totalCost > previous.totalCost * 2 + 100) {
      violations.push(
        `${entry.fingerprint}: total cost more than doubled (${previous.totalCost} -> ${entry.totalCost})`,
      );
    }
  }
  return { added, changed, riskByFingerprint, unchanged, violations };
}

function renderComparison(comparison: PlanComparison): string {
  const lines = [
    "## Database query-plan changes",
    "",
    `- Added: ${comparison.added.length}`,
    `- Changed: ${comparison.changed.length}`,
    `- Unchanged: ${comparison.unchanged.length}`,
    `- Violations: ${comparison.violations.length}`,
    "",
    "Risk: ✅ low = expected, 🟠 review = investigate, 🔴 high = blocks the gate.",
  ];
  if (comparison.added.length > 0) {
    lines.push("", "### Added query plans", "");
    for (const entry of comparison.added) {
      lines.push(
        `- ${comparison.riskByFingerprint.get(entry.fingerprint)} \`${entry.fingerprint.slice(0, 12)}\`: ${entry.sql} (cost ${entry.totalCost}, max rows ${entry.maxPlanRows}, sources: ${entry.testSources.join(", ") || "unknown"})`,
      );
    }
  }
  if (comparison.changed.length > 0) {
    lines.push("", "### Changed query plans", "");
    for (const entry of comparison.changed) {
      lines.push(
        `- ${comparison.riskByFingerprint.get(entry.fingerprint)} \`${entry.fingerprint.slice(0, 12)}\`: ${entry.sql} (cost ${entry.totalCost}, max rows ${entry.maxPlanRows}, shape ${entry.planFingerprint.slice(0, 12)}, sources: ${entry.testSources.join(", ") || "unknown"})`,
      );
    }
  }
  if (comparison.violations.length > 0) {
    lines.push(
      "",
      "### Policy violations",
      "",
      ...comparison.violations.map((violation) => `- ${violation}`),
    );
  }
  return `${lines.join("\n")}\n`;
}

const databaseUrl = process.env.QUERY_PLAN_DATABASE_URL;
const generatedCorpusPath = repositoryPath(".artifacts/query-corpus.json");
let corpusPath = "query-plans/corpus.json";
if (existsSync(generatedCorpusPath)) {
  corpusPath = ".artifacts/query-corpus.json";
}
if (
  typeof process.env.QUERY_PLAN_CORPUS === "string" &&
  process.env.QUERY_PLAN_CORPUS.length > 0
) {
  corpusPath = process.env.QUERY_PLAN_CORPUS;
}
corpusPath = repositoryPath(corpusPath);
const baselinePath = repositoryPath(
  process.env.QUERY_PLAN_BASELINE ?? "query-plans/baseline.json",
);
const outputPath = repositoryPath(
  process.env.QUERY_PLAN_OUTPUT ?? ".artifacts/query-plans.md",
);
if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
  throw new TypeError("QUERY_PLAN_DATABASE_URL is required");
}

const corpus = queryCorpusSchema.parse(JSON.parse(await readFile(corpusPath, "utf8")));
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
  const explainedEntries = await Promise.all(
    corpus.queries.map(async (query): Promise<PlanEntry> => {
      const rows: readonly unknown[] = await sql.unsafe(explainStatement(query.sql));
      const plan = readPlanResult(rows);
      return {
        fingerprint: query.fingerprint,
        maxPlanRows: maxPlanRows(plan),
        plan,
        planFingerprint: planFingerprint(plan),
        sql: query.sql,
        testSources: query.testSources,
        totalCost: plan["Total Cost"],
      };
    }),
  );
  planEntries.push(...explainedEntries);
} finally {
  await sql.end({ timeout: 5 });
}

const current: PlanArtifact = { databaseVersion, queries: planEntries, version: 1 };
await mkdir(repositoryPath(".artifacts"), { recursive: true });
const currentJson = `${JSON.stringify(current, jsonIdentity, 2)}\n`;
await writeFile(repositoryPath(".artifacts/query-plans.json"), currentJson, "utf8");
if (process.env.QUERY_PLAN_WRITE_BASELINE === "1") {
  await writeFile(baselinePath, currentJson, "utf8");
  await writeFile(
    outputPath,
    "## Database query-plan baseline\n\nBaseline initialized from the pinned planner fixture.\n",
    "utf8",
  );
} else {
  const baseline = await readArtifact(baselinePath);
  const comparison = comparePlans(current, baseline);
  await writeFile(outputPath, renderComparison(comparison), "utf8");
  if (comparison.violations.length > 0) {
    process.exitCode = 1;
  }
}
