import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import nodePath from "node:path";
import { describe, expect, it } from "vitest";

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

function runPlanner(root: string, baseline?: string): SpawnSyncReturns<string> {
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
        QUERY_PLAN_BASELINE: baseline,
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

  it("fails closed when an explicitly supplied baseline is missing", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      const baseline = nodePath.join(root, ".artifacts/base-plans.json");
      const result = runPlanner(root, baseline);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Plan artifact is invalid: ${baseline}`);
    });
  });

  it("fails closed when an explicitly supplied baseline is invalid", () => {
    expect.hasAssertions();
    withPlannerFixture((root) => {
      writeFileSync(nodePath.join(root, ".artifacts/base-plans.json"), "{}");
      const baseline = nodePath.join(root, ".artifacts/base-plans.json");
      const result = runPlanner(root, baseline);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`Plan artifact is invalid: ${baseline}`);
    });
  });
});
