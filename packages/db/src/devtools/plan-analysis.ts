import { createHash } from "node:crypto";
import { z } from "zod";

interface PlanNode {
  readonly "Index Name": string;
  readonly "Node Type": string;
  readonly "Plan Rows": number;
  readonly Plans: readonly PlanNode[];
  readonly "Relation Name": string;
  readonly "Relation Rows": number;
  readonly Schema: string;
  readonly "Total Cost": number;
}

const planNodeSchema: z.ZodType<PlanNode> = z.lazy(() =>
  z.looseObject({
    "Index Name": z.string().default(""),
    "Node Type": z.string(),
    "Plan Rows": z.number().default(0),
    Plans: z.array(planNodeSchema).default([]),
    "Relation Name": z.string().default(""),
    "Relation Rows": z.number().nonnegative().default(0),
    Schema: z.string().default("public"),
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
  queries: z.array(planEntrySchema).min(1),
  version: z.literal(1),
});

interface PlanComparison {
  readonly added: readonly PlanEntry[];
  readonly changed: readonly PlanEntry[];
  readonly previousByFingerprint: ReadonlyMap<string, PlanEntry>;
  readonly removed: readonly PlanEntry[];
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
  if (
    ["Seq Scan", "Parallel Seq Scan"].includes(node["Node Type"]) &&
    Math.max(node["Relation Rows"], node["Plan Rows"]) > 10_000
  ) {
    return true;
  }
  return node.Plans.some((childPlan) => hasLargeSequentialScan(childPlan));
}

function hasSequentialScan(node: PlanNode): boolean {
  if (["Seq Scan", "Parallel Seq Scan"].includes(node["Node Type"])) {
    return true;
  }
  return node.Plans.some((childPlan) => hasSequentialScan(childPlan));
}

function hasNodeType(node: PlanNode, nodeType: string): boolean {
  return (
    node["Node Type"] === nodeType ||
    node.Plans.some((childPlan) => hasNodeType(childPlan, nodeType))
  );
}

function warningsForPlan(node: PlanNode): readonly string[] {
  const warnings: string[] = [];
  if (hasNodeType(node, "Nested Loop")) {
    warnings.push(
      "Nested Loop can repeat inner work for each outer row; check that the outer row count is bounded and the inner side has an efficient access path.",
    );
  }
  if (hasSequentialScan(node)) {
    warnings.push(
      "Sequential scan present; confirm the scanned relation is small or the scan is intentional.",
    );
  }
  return warnings;
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
  return `EXPLAIN (FORMAT JSON, GENERIC_PLAN TRUE, VERBOSE TRUE) ${statement}`;
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

function comparePlans(current: PlanArtifact, baseline?: PlanArtifact): PlanComparison {
  const baselineQueries = baseline?.queries ?? [];
  const baselineByFingerprint = new Map(
    baselineQueries.map((entry) => [entry.fingerprint, entry]),
  );
  const currentFingerprints = new Set(
    current.queries.map((entry) => entry.fingerprint),
  );
  const added: PlanEntry[] = [];
  const changed: PlanEntry[] = [];
  const removed = baselineQueries.filter(
    (entry) => !currentFingerprints.has(entry.fingerprint),
  );
  const unchanged: PlanEntry[] = [];
  const riskByFingerprint = new Map<string, string>();
  const violations: string[] = [];
  for (const entry of current.queries) {
    const previous = baselineByFingerprint.get(entry.fingerprint);
    if (!previous) {
      added.push(entry);
    } else if (
      previous.planFingerprint === entry.planFingerprint &&
      previous.totalCost === entry.totalCost &&
      previous.maxPlanRows === entry.maxPlanRows &&
      JSON.stringify(previous.plan) === JSON.stringify(entry.plan)
    ) {
      unchanged.push(entry);
    } else {
      changed.push(entry);
    }
    riskByFingerprint.set(entry.fingerprint, riskForPlan(entry, previous));
    if (hasLargeSequentialScan(entry.plan)) {
      violations.push(
        `${entry.fingerprint}: sequential scan reads a relation exceeding 10,000 estimated rows`,
      );
    }
    if (entry.totalCost > 100_000) {
      violations.push(`${entry.fingerprint}: total cost exceeds 100,000`);
    }
    if (previous && entry.totalCost > previous.totalCost * 2 + 100) {
      violations.push(
        `${entry.fingerprint}: total cost more than doubled (${previous.totalCost} -> ${entry.totalCost})`,
      );
    }
  }
  if (baseline && current.databaseVersion !== baseline.databaseVersion) {
    violations.push(
      `PostgreSQL version changed (${baseline.databaseVersion} -> ${current.databaseVersion}); plans are not directly comparable`,
    );
  }
  return {
    added,
    changed,
    previousByFingerprint: baselineByFingerprint,
    removed,
    riskByFingerprint,
    unchanged,
    violations,
  };
}

function renderEntry(
  entry: PlanEntry,
  risk: string,
  previous?: PlanEntry,
): readonly string[] {
  const warnings = warningsForPlan(entry.plan);
  let warningLabel = "warnings";
  if (warnings.length === 1) {
    warningLabel = "warning";
  }
  const lines = [
    `- ${risk} \`${entry.fingerprint.slice(0, 12)}\` · cost ${entry.totalCost} · max rows ${entry.maxPlanRows} · shape \`${entry.planFingerprint.slice(0, 12)}\` · sources: ${entry.testSources.join(", ") || "unknown"}`,
    "",
    "  <details>",
    `  <summary>SQL, plan, and ${warnings.length} planner ${warningLabel}</summary>`,
    "",
    "  **SQL**",
    "  ```sql",
    ...entry.sql.split("\n").map((line) => `  ${line}`),
    "  ```",
  ];
  if (warnings.length > 0) {
    lines.push(
      "",
      "  **Planner warnings**",
      "",
      ...warnings.map((warning) => `  - ${warning}`),
    );
  }
  if (previous) {
    lines.push(
      "",
      "  **Base plan**",
      "  ```json",
      ...JSON.stringify(previous.plan, jsonIdentity, 2)
        .split("\n")
        .map((line) => `  ${line}`),
      "  ```",
    );
  }
  lines.push(
    "",
    "  **Current plan**",
    "  ```json",
    ...JSON.stringify(entry.plan, jsonIdentity, 2)
      .split("\n")
      .map((line) => `  ${line}`),
    "  ```",
    "  </details>",
  );
  return lines;
}

function renderComparison(comparison: PlanComparison): string {
  const lines = [
    "## Database query-plan changes",
    "",
    `- Added: ${comparison.added.length}`,
    `- Removed: ${comparison.removed.length}`,
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
        ...renderEntry(
          entry,
          comparison.riskByFingerprint.get(entry.fingerprint) ?? "🟠 review",
          comparison.previousByFingerprint.get(entry.fingerprint),
        ),
      );
    }
  }
  if (comparison.removed.length > 0) {
    lines.push("", "### Removed query plans", "");
    for (const entry of comparison.removed) {
      lines.push(
        `- \`${entry.fingerprint.slice(0, 12)}\` · previous cost ${entry.totalCost} · sources: ${entry.testSources.join(", ") || "unknown"}`,
        "",
        "  ```sql",
        ...entry.sql.split("\n").map((line) => `  ${line}`),
        "  ```",
      );
    }
  }
  if (comparison.changed.length > 0) {
    lines.push("", "### Changed query plans", "");
    for (const entry of comparison.changed) {
      lines.push(
        ...renderEntry(
          entry,
          comparison.riskByFingerprint.get(entry.fingerprint) ?? "🟠 review",
          comparison.previousByFingerprint.get(entry.fingerprint),
        ),
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

export {
  planArtifactSchema,
  comparePlans,
  explainStatement,
  maxPlanRows,
  planFingerprint,
  planNodeSchema,
  readPlanResult,
  renderComparison,
};
export type { PlanArtifact, PlanEntry, PlanNode };
