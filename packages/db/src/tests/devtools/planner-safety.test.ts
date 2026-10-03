import { describe, expect, it } from "vitest";
import { disposableDatabaseSchema } from "../../devtools/disposable-database";
import {
  comparePlans,
  planNodeSchema,
  renderComparison,
  type PlanArtifact,
} from "../../devtools/plan-analysis";

function artifact(rows: number, cost: number): PlanArtifact {
  const plan = planNodeSchema.parse({
    "Node Type": "Seq Scan",
    "Plan Rows": 1,
    "Relation Rows": rows,
    "Total Cost": cost,
    "Relation Name": "users",
  });
  return {
    version: 1,
    databaseVersion: "18.3",
    queries: [
      {
        fingerprint: "query",
        planFingerprint: "shape",
        plan,
        sql: "select * from users where email = $1",
        testSources: ["test"],
        totalCost: cost,
        maxPlanRows: 1,
      },
    ],
  };
}

describe("planner safety", () => {
  it("rejects remote, ordinary, mismatched and overridden targets before connecting", () => {
    expect.hasAssertions();
    for (const url of [
      "postgresql://localhost/product",
      "postgresql://remote/planner_ci",
      "postgresql://localhost/planner_other",
      "postgresql://localhost/planner_ci?host=remote",
      "https://localhost/planner_ci",
    ]) {
      expect(
        disposableDatabaseSchema.safeParse({ url, expectedDatabase: "planner_ci" })
          .success,
      ).toBe(false);
    }
    expect(
      disposableDatabaseSchema.safeParse({ url: "postgresql://localhost/planner_ci" })
        .success,
    ).toBe(false);
    expect(
      disposableDatabaseSchema.parse({
        url: "postgresql://localhost/planner_ci",
        expectedDatabase: "planner_ci",
      }).databaseName,
    ).toBe("planner_ci");
  });

  it("blocks a selective sequential scan of a large relation", () => {
    expect.hasAssertions();
    expect(
      comparePlans(artifact(1_000_000, 300), artifact(10_000, 300)).violations,
    ).toHaveLength(1);
  });

  it("shows both plans for cost changes without a shape change", () => {
    expect.hasAssertions();
    const comparison = comparePlans(artifact(10_000, 900), artifact(10_000, 300));
    expect(comparison.changed).toHaveLength(1);
    expect(renderComparison(comparison)).toContain("**Base plan**");
    expect(comparison.violations).toHaveLength(1);
  });

  it("assesses fresh captures without a baseline and still blocks unsafe plans", () => {
    expect.hasAssertions();
    const safe = comparePlans(artifact(10_000, 300));
    expect(safe.added).toHaveLength(1);
    expect(safe.violations).toHaveLength(0);
    expect(renderComparison(safe)).toContain("**Current plan**");
    expect(comparePlans(artifact(1_000_000, 300)).violations).toHaveLength(1);
    expect(comparePlans(artifact(10_000, 100_001)).violations).toHaveLength(1);
  });

  it("reports changed access paths even when the captured SQL is unchanged", () => {
    expect.hasAssertions();
    const current = artifact(10_000, 300);
    const previous: PlanArtifact = {
      ...current,
      queries: current.queries.map((entry) => ({
        ...entry,
        planFingerprint: "indexed-shape",
        plan: {
          ...entry.plan,
          "Node Type": "Index Scan",
          "Index Name": "users_email_unique",
        },
      })),
    };
    const comparison = comparePlans(current, previous);
    expect(comparison.added).toHaveLength(0);
    expect(comparison.removed).toHaveLength(0);
    expect(comparison.changed).toHaveLength(1);
    expect(renderComparison(comparison)).toContain("**Base plan**");
    expect(renderComparison(comparison)).toContain("users_email_unique");
  });
});
