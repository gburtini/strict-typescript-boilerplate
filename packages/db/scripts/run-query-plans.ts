import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import postgres from "postgres";

const repositoryRoot = nodePath.resolve(import.meta.dirname, "../../..");

function repositoryPath(relativePath: string): string {
  return nodePath.resolve(repositoryRoot, relativePath);
}

interface QueryCorpusEntry {
  readonly fingerprint: string;
  readonly sql: string;
  readonly testSources: readonly string[];
}

interface QueryCorpus {
  readonly queries: readonly QueryCorpusEntry[];
  readonly version: 1;
}

interface PlanNode {
  readonly "Node Type": string;
  readonly "Plan Rows"?: number;
  readonly "Total Cost"?: number;
  readonly "Relation Name"?: string;
  readonly "Index Name"?: string;
  readonly Plans?: readonly PlanNode[];
}

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

function jsonIdentity(_key: string, value: unknown): unknown {
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, name: string): string {
  if (typeof value !== "string") throw new TypeError(`${name} must be a string`);
  return value;
}

function readQueryCorpus(value: unknown): QueryCorpus {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.queries)) {
    throw new TypeError("Query corpus has an invalid shape");
  }
  const queries: QueryCorpusEntry[] = [];
  for (const valueEntry of value.queries) {
    if (!isRecord(valueEntry)) throw new TypeError("Query corpus entry is invalid");
    queries.push({
      fingerprint: readString(valueEntry.fingerprint, "fingerprint"),
      sql: readString(valueEntry.sql, "sql"),
      testSources: Array.isArray(valueEntry.testSources)
        ? valueEntry.testSources.filter(
            (source): source is string => typeof source === "string",
          )
        : [],
    });
  }
  return { queries, version: 1 };
}

function readPlanNode(value: unknown): PlanNode {
  if (!isRecord(value) || typeof value["Node Type"] !== "string") {
    throw new TypeError("PostgreSQL returned an invalid plan node");
  }
  const childPlans = value.Plans;
  return {
    "Node Type": value["Node Type"],
    ...(typeof value["Plan Rows"] === "number"
      ? { "Plan Rows": value["Plan Rows"] }
      : {}),
    ...(typeof value["Total Cost"] === "number"
      ? { "Total Cost": value["Total Cost"] }
      : {}),
    ...(typeof value["Relation Name"] === "string"
      ? { "Relation Name": value["Relation Name"] }
      : {}),
    ...(typeof value["Index Name"] === "string"
      ? { "Index Name": value["Index Name"] }
      : {}),
    ...(Array.isArray(childPlans)
      ? { Plans: childPlans.map((childPlan) => readPlanNode(childPlan)) }
      : {}),
  };
}

function planFingerprint(node: PlanNode): string {
  const shape = JSON.stringify({
    index: node["Index Name"],
    node: node["Node Type"],
    relation: node["Relation Name"],
    plans: node.Plans?.map((childPlan) => planFingerprint(childPlan)),
  });
  return createHash("sha256").update(shape).digest("hex");
}

function maxPlanRows(node: PlanNode): number {
  return Math.max(
    node["Plan Rows"] ?? 0,
    ...(node.Plans?.map((childPlan) => maxPlanRows(childPlan)) ?? []),
  );
}

function hasLargeSequentialScan(node: PlanNode): boolean {
  if (node["Node Type"] === "Seq Scan" && (node["Plan Rows"] ?? 0) > 10_000) {
    return true;
  }
  return node.Plans?.some((childPlan) => hasLargeSequentialScan(childPlan)) ?? false;
}

function hasSequentialScan(node: PlanNode): boolean {
  if (node["Node Type"] === "Seq Scan") return true;
  return node.Plans?.some((childPlan) => hasSequentialScan(childPlan)) ?? false;
}

function riskForPlan(entry: PlanEntry, previous: PlanEntry | undefined): string {
  if (
    hasLargeSequentialScan(entry.plan) ||
    entry.totalCost > 100_000 ||
    (previous !== undefined && entry.totalCost > previous.totalCost * 2 + 100)
  ) {
    return "🔴 high";
  }
  if (
    hasSequentialScan(entry.plan) ||
    entry.totalCost > 10_000 ||
    (previous !== undefined && previous.planFingerprint !== entry.planFingerprint)
  ) {
    return "🟠 review";
  }
  return "✅ low";
}

function explainStatement(sql: string): string {
  const statement = sql.trim().replace(/;$/u, "");
  if (statement.includes(";"))
    throw new TypeError("Query corpus SQL cannot contain multiple statements");
  return `EXPLAIN (FORMAT JSON, GENERIC_PLAN TRUE) ${statement}`;
}

function readPlanResult(rows: readonly unknown[]): PlanNode {
  const row = rows[0];
  if (!isRecord(row) || !Array.isArray(row["QUERY PLAN"])) {
    throw new TypeError("PostgreSQL returned no JSON query plan");
  }
  const document: unknown = row["QUERY PLAN"].at(0);
  if (!isRecord(document))
    throw new TypeError("PostgreSQL returned an invalid JSON query plan");
  return readPlanNode(document.Plan);
}

async function readArtifact(path: string): Promise<PlanArtifact> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.databaseVersion !== "string" ||
    !Array.isArray(value.queries)
  ) {
    throw new TypeError(`Plan artifact is invalid: ${path}`);
  }
  const queries: PlanEntry[] = [];
  for (const query of value.queries) {
    if (!isRecord(query)) {
      throw new TypeError(`Plan artifact entry is invalid: ${path}`);
    }
    queries.push({
      fingerprint: readString(query.fingerprint, "plan fingerprint"),
      maxPlanRows: typeof query.maxPlanRows === "number" ? query.maxPlanRows : 0,
      plan: readPlanNode(query.plan),
      planFingerprint: readString(query.planFingerprint, "plan shape fingerprint"),
      sql: readString(query.sql, "plan SQL"),
      testSources: Array.isArray(query.testSources)
        ? query.testSources.filter(
            (source): source is string => typeof source === "string",
          )
        : [],
      totalCost: typeof query.totalCost === "number" ? query.totalCost : 0,
    });
  }
  return { databaseVersion: value.databaseVersion, queries, version: 1 };
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
    if (previous === undefined) added.push(entry);
    else if (previous.planFingerprint === entry.planFingerprint) unchanged.push(entry);
    else changed.push(entry);
    riskByFingerprint.set(entry.fingerprint, riskForPlan(entry, previous));
    if (hasLargeSequentialScan(entry.plan)) {
      violations.push(
        `${entry.fingerprint}: sequential scan exceeds 10,000 estimated rows`,
      );
    }
    if (previous !== undefined && entry.totalCost > previous.totalCost * 2 + 100) {
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
const corpusPath = repositoryPath(
  process.env.QUERY_PLAN_CORPUS ?? "query-plans/corpus.json",
);
const baselinePath = repositoryPath(
  process.env.QUERY_PLAN_BASELINE ?? "query-plans/baseline.json",
);
const outputPath = repositoryPath(
  process.env.QUERY_PLAN_OUTPUT ?? ".artifacts/query-plans.md",
);
if (typeof databaseUrl !== "string" || databaseUrl.length === 0)
  throw new TypeError("QUERY_PLAN_DATABASE_URL is required");

const corpus = readQueryCorpus(JSON.parse(await readFile(corpusPath, "utf8")));
const sql = postgres(databaseUrl, { max: 1, prepare: false });
const planEntries: PlanEntry[] = [];
let databaseVersion = "unknown";
try {
  const versionRows: readonly unknown[] = await sql.unsafe(
    "SELECT current_setting('server_version') AS version",
  );
  const versionRow = versionRows[0];
  databaseVersion = isRecord(versionRow)
    ? readString(versionRow.version, "database version")
    : "unknown";
  for (const query of corpus.queries) {
    const rows: readonly unknown[] = await sql.unsafe(explainStatement(query.sql));
    const plan = readPlanResult(rows);
    planEntries.push({
      fingerprint: query.fingerprint,
      maxPlanRows: maxPlanRows(plan),
      plan,
      planFingerprint: planFingerprint(plan),
      sql: query.sql,
      testSources: query.testSources,
      totalCost: plan["Total Cost"] ?? 0,
    });
  }
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
  if (comparison.violations.length > 0) process.exitCode = 1;
}
