import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, expect, it } from "vitest";
import {
  planFingerprint,
  planNodeSchema,
  type PlanArtifact,
} from "../../devtools/plan-analysis";

const repositoryRoot = nodePath.resolve(import.meta.dirname, "../../../../..");

// Real filesystem and subprocess boundaries: the isolated runner must reject
// Invalid capture inputs before attempting a database connection.
function withPlannerFixture(check: (root: string) => void): void {
  const root = mkdtempSync(nodePath.join(tmpdir(), "planner-runner-"));
  try {
    for (const directory of [
      "devtools/scripts/database",
      "devtools/scripts/shared",
      "devtools/query-plans",
      ".artifacts",
    ]) {
      mkdirSync(nodePath.join(root, directory), { recursive: true });
    }
    for (const file of [
      "devtools/scripts/database/run-query-plans.ts",
      "devtools/scripts/database/compare-query-plans.ts",
      "devtools/scripts/shared/repository-paths.ts",
    ]) {
      copyFileSync(nodePath.join(repositoryRoot, file), nodePath.join(root, file));
    }
    symlinkSync(
      nodePath.join(repositoryRoot, "node_modules"),
      nodePath.join(root, "node_modules"),
      "dir",
    );
    writeFileSync(nodePath.join(root, "package.json"), '{"type":"module"}');
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runPlanner(root: string): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      nodePath.join(root, "devtools/scripts/database/run-query-plans.ts"),
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        QUERY_PLAN_DATABASE_URL: "postgresql://localhost:1/planner_fixture",
      },
    },
  );
}

describe("planner runner capture boundary", () => {
  it("requires a captured corpus even when a legacy committed corpus exists", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writeFileSync(
        nodePath.join(root, "devtools/query-plans/corpus.json"),
        '{"queries":[],"version":1}',
      );
      const result = runPlanner(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("ENOENT");
      expect(result.stderr).toContain(
        nodePath.join(root, ".artifacts/query-corpus.json"),
      );
    });
  });

  it("rejects an empty capture before connecting", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writeFileSync(
        nodePath.join(root, ".artifacts/query-corpus.json"),
        '{"queries":[],"version":1}',
      );
      const result = runPlanner(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("The captured query corpus is empty");
    });
  });

  it("rejects an invalid capture before connecting", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writeFileSync(
        nodePath.join(root, ".artifacts/query-corpus.json"),
        '{"queries":[{"sql":"SELECT 1"}],"version":1}',
      );
      const result = runPlanner(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("ZodError");
    });
  });
});

function runComparison(
  root: string,
  args: readonly string[],
): SpawnSyncReturns<string> {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      nodePath.join(root, "devtools/scripts/database/compare-query-plans.ts"),
      ...args,
    ],
    { cwd: root, encoding: "utf8", env: {} },
  );
}

function writePlan(
  root: string,
  name: string,
  cost: number,
  databaseVersion = "18.3",
): void {
  const plan = planNodeSchema.parse({
    "Node Type": "Index Scan",
    "Index Name": "users_pkey",
    "Relation Name": "users",
    "Relation Rows": 10_000,
    "Plan Rows": 1,
    "Total Cost": cost,
  });
  const artifact: PlanArtifact = {
    version: 1,
    databaseVersion,
    queries: [
      {
        fingerprint: "query",
        planFingerprint: planFingerprint(plan),
        plan,
        sql: "select * from users where id = $1",
        testSources: ["fixture"],
        totalCost: cost,
        maxPlanRows: 1,
      },
    ],
  };
  writeFileSync(nodePath.join(root, name), JSON.stringify(artifact));
}

describe("offline planner comparison", () => {
  it("compares both branch artifacts without a database connection", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writePlan(root, "base.json", 100);
      writePlan(root, "current.json", 100);
      const result = runComparison(root, ["base.json", "current.json"]);
      expect(result.status).toBe(0);
      expect(
        readFileSync(nodePath.join(root, ".artifacts/query-plans.md"), "utf8"),
      ).toContain("Unchanged: 1");
    });
  });

  it.each([{ args: [] }, { args: ["base.json"] }])(
    "requires both artifact arguments: $args",
    ({ args }) => {
      expect.hasAssertions();
      withPlannerFixture((root) => {
        const result = runComparison(root, args);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Usage: pnpm db:plans:compare");
      });
    },
  );

  it.each([
    { base: "missing.json", current: "valid.json" },
    { base: "valid.json", current: "missing.json" },
  ])(
    "fails closed when either artifact is missing: $base, $current",
    ({ base, current }) => {
      expect.hasAssertions();
      withPlannerFixture((root) => {
        writePlan(root, "valid.json", 100);
        const result = runComparison(root, [base, current]);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Plan artifact is invalid: missing.json");
      });
    },
  );

  it.each([
    { document: {} },
    { document: { version: 1, databaseVersion: "18.3", queries: [] } },
  ])("rejects invalid and empty plan artifacts: $document", ({ document }) => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writeFileSync(nodePath.join(root, "invalid.json"), JSON.stringify(document));
      writePlan(root, "valid.json", 100);
      const result = runComparison(root, ["valid.json", "invalid.json"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Plan artifact is invalid: invalid.json");
    });
  });

  it("blocks cost regressions and writes both plans to the requested report", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writePlan(root, "base.json", 100);
      writePlan(root, "current.json", 400);
      const result = runComparison(root, [
        "base.json",
        "current.json",
        "reports/comparison.md",
      ]);
      expect(result.status).toBe(1);
      const report = readFileSync(nodePath.join(root, "reports/comparison.md"), "utf8");
      expect(report).toContain("total cost more than doubled");
      expect(report).toContain("**Base plan**");
      expect(report).toContain("**Current plan**");
    });
  });

  it("rejects artifacts from different PostgreSQL versions", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writePlan(root, "base.json", 100, "18.2");
      writePlan(root, "current.json", 100);
      const result = runComparison(root, ["base.json", "current.json"]);
      expect(result.status).toBe(1);
      expect(
        readFileSync(nodePath.join(root, ".artifacts/query-plans.md"), "utf8"),
      ).toContain("PostgreSQL version changed");
    });
  });
});
