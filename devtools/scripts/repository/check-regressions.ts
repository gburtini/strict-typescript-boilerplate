import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import nodePath from "node:path";
import { copyRepositorySources } from "../shared/copy-repository.ts";
import { repositoryRoot } from "../shared/repository-paths.ts";
import { verifyRegressionReport } from "./regression-reports.ts";

interface RegressionCase {
  readonly workspace: string;
  readonly source: string;
  readonly test: string;
  readonly title: string;
  readonly before: string;
  readonly after: string;
  readonly failure: string;
}

const cases: readonly RegressionCase[] = [
  {
    workspace: "packages/core",
    source: "src/retry.ts",
    test: "src/tests/retry.test.ts",
    title: "performs the configured total number of attempts",
    before: "policy.attempts - minimumAttempts",
    after: "policy.attempts - minimumAttempts - 1",
    failure: "transient failure",
  },
  {
    workspace: "packages/db",
    source: "src/query-capture.ts",
    test: "src/tests/query-capture.test.ts",
    title: "normalizes only superficial SQL whitespace",
    before: 'return sql.replaceAll(/\\s+/gu, " ").trim();',
    after: "return sql;",
    failure: "SELECT * FROM users",
  },
  {
    workspace: "apps/web",
    source: "server/static-assets.ts",
    test: "src/tests/static-assets.test.ts",
    title: "sets 'public, max-age=31536000, immutable' for '/assets/app-ABCdef12.js'",
    before: '"public, max-age=31536000, immutable"',
    after: '"no-cache"',
    failure: "to match object",
  },
];

mkdirSync(nodePath.join(repositoryRoot, ".artifacts"), { recursive: true });
const artifacts = mkdtempSync(
  nodePath.join(repositoryRoot, ".artifacts", "regressions-"),
);
const checkout = nodePath.join(artifacts, "checkout");

function runTest(testCase: RegressionCase, mutated: boolean): void {
  let state = "baseline";
  let expectedStatus = 0;
  if (mutated) {
    state = "mutant";
    expectedStatus = 1;
  }
  const name = `${nodePath.basename(testCase.workspace)}-${state}`;
  const reportPath = nodePath.join(artifacts, `${name}.json`);
  const cwd = nodePath.join(checkout, testCase.workspace);
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      testCase.test,
      "--reporter=json",
      `--outputFile=${reportPath}`,
    ],
    {
      cwd,
      encoding: "utf8",
      maxBuffer: 16_777_216,
    },
  );
  writeFileSync(
    nodePath.join(artifacts, `${name}.log`),
    `${result.stdout}\n${result.stderr}`,
  );
  if (result.error || result.status !== expectedStatus) {
    throw new Error(
      `${name} returned unexpected exit status: ${String(result.status)}; see ${artifacts}`,
      {
        cause: result.error,
      },
    );
  }
  verifyRegressionReport(
    JSON.parse(readFileSync(reportPath, "utf8")),
    {
      testPath: nodePath.join(cwd, testCase.test),
      title: testCase.title,
      failure: testCase.failure,
    },
    mutated,
  );
}

function verifyMutation(testCase: RegressionCase): void {
  const sourcePath = nodePath.join(checkout, testCase.workspace, testCase.source);
  const source = readFileSync(sourcePath, "utf8");
  if (source.split(testCase.before).length !== 2) {
    throw new TypeError(`Mutation must match exactly once: ${testCase.source}`);
  }
  runTest(testCase, false);
  try {
    writeFileSync(sourcePath, source.replace(testCase.before, testCase.after));
    runTest(testCase, true);
    process.stdout.write(
      `Regression proved: ${testCase.workspace} — ${testCase.title}\n`,
    );
  } finally {
    writeFileSync(sourcePath, source);
  }
}

try {
  copyRepositorySources(checkout);
  for (const workspace of [
    ".",
    "packages/core",
    "packages/db",
    "apps/web",
    "packages/ui",
  ]) {
    symlinkSync(
      nodePath.join(repositoryRoot, workspace, "node_modules"),
      nodePath.join(checkout, workspace, "node_modules"),
      "junction",
    );
  }
  for (const testCase of cases) {
    verifyMutation(testCase);
  }
  process.stdout.write(`Regression reports retained: ${artifacts}\n`);
} finally {
  rmSync(checkout, { recursive: true, force: true });
}
