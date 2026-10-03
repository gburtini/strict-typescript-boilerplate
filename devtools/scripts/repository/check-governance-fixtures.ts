import { readFileSync } from "node:fs";
import { config } from "../../../oxlint.config.ts";
import { expectRejection } from "../shared/expect-rejection.ts";
import { validateExceptionRegistry } from "./lint-exceptions.ts";
import { verifyRegressionReport } from "./regression-reports.ts";
import {
  requireWorkflowCommand,
  validateSemanticWorkflow,
  validateAcceptanceWorkflow,
  validateQueryPlanWorkflow,
} from "./ci-contracts.ts";
import { parse } from "yaml";
import { readProjectProfile, validateAcceptance } from "./check-project-profile.ts";

const registry: unknown = JSON.parse(
  readFileSync("devtools/quality/exceptions.json", "utf8"),
);
validateExceptionRegistry(config, registry);
expectRejection(
  () =>
    validateExceptionRegistry(
      { ...config, rules: { ...config.rules, "typescript/no-explicit-any": "off" } },
      registry,
    ),
  "match approved",
);
expectRejection(
  () =>
    validateExceptionRegistry(
      { ...config, ignorePatterns: [...config.ignorePatterns, "apps"] },
      registry,
    ),
  "match approved",
);
expectRejection(
  () =>
    validateExceptionRegistry(
      {
        ...config,
        overrides: [
          ...config.overrides,
          { files: ["apps/**"], rules: { "typescript/no-floating-promises": "off" } },
        ],
      },
      registry,
    ),
  "match approved",
);
const expectation = {
  testPath: "owner/src/tests/behavior.test.ts",
  title: "protects the boundary",
  failure: "invalid input",
};
const assertion = {
  title: expectation.title,
  status: "passed",
  failureMessages: [],
};
const report = {
  success: true,
  numFailedTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  testResults: [
    { name: expectation.testPath, message: "", assertionResults: [assertion] },
  ],
};
verifyRegressionReport(report, expectation, false);
const mutant = {
  ...report,
  success: false,
  numFailedTests: 1,
  testResults: [
    {
      ...report.testResults[0],
      assertionResults: [
        {
          ...assertion,
          status: "failed",
          failureMessages: ["invalid input accepted"],
        },
      ],
    },
  ],
};
verifyRegressionReport(mutant, expectation, true);
expectRejection(
  () => verifyRegressionReport(report, expectation, true),
  "Mutation must fail",
);
expectRejection(
  () => verifyRegressionReport(mutant, expectation, false),
  "baseline must pass",
);
expectRejection(
  () => verifyRegressionReport(mutant, { ...expectation, title: "missing test" }, true),
  "expected test",
);
expectRejection(
  () =>
    verifyRegressionReport(
      mutant,
      { ...expectation, failure: "different defect" },
      true,
    ),
  "intended reason",
);
expectRejection(
  () => verifyRegressionReport({ ...mutant, numFailedTests: 2 }, expectation, true),
  "all failures",
);
expectRejection(
  () => verifyRegressionReport({ ...mutant, testResults: [] }, expectation, true),
  "Too small",
);
expectRejection(
  () => verifyRegressionReport({ ...report, numPendingTests: 1 }, expectation, false),
  "Invalid input",
);
expectRejection(
  () =>
    verifyRegressionReport(
      {
        ...mutant,
        testResults: [
          {
            ...mutant.testResults[0],
            message: "Failed to load test module",
          },
        ],
      },
      expectation,
      true,
    ),
  "Invalid input",
);
const workflow = {
  on: { push: {} },
  permissions: { contents: "read" },
  jobs: {
    evaluate: {
      if: "github.ref == 'refs/heads/main'",
      steps: [{ run: "pnpm check:all" }],
    },
  },
};
requireWorkflowCommand(workflow, "pnpm check:all");
validateSemanticWorkflow(workflow);
expectRejection(
  () =>
    requireWorkflowCommand(
      { ...workflow, jobs: { check: { steps: [{ run: "echo pnpm check:all" }] } } },
      "pnpm check:all",
    ),
  "unconditional executable",
);
expectRejection(
  () => validateSemanticWorkflow({ ...workflow, on: { pull_request: {} } }),
  "cannot execute",
);
expectRejection(
  () => requireWorkflowCommand({ on: {}, jobs: {} }, "pnpm check:all"),
  "permissions",
);
const acceptanceWorkflow = validateAcceptanceWorkflow(
  parse(readFileSync(".github/workflows/check.yml", "utf8")),
);
for (const jobName of ["initialization", "repository"]) {
  for (const inputs of [
    { "include-hidden-files": false },
    { path: ".artifacts/initialization-smoke-*" },
    { path: ".artifacts" },
    { "if-no-files-found": "ignore" },
    { name: "unrelated-evidence" },
  ]) {
    expectRejection(
      () =>
        validateAcceptanceWorkflow({
          ...acceptanceWorkflow,
          jobs: {
            ...acceptanceWorkflow.jobs,
            [jobName]: {
              steps: acceptanceWorkflow.jobs[jobName]?.steps?.map((step) => {
                if (step.uses?.startsWith("actions/upload-artifact@") === true) {
                  return { ...step, with: { ...step.with, ...inputs } };
                }
                return step;
              }),
            },
          },
        }),
      "upload hidden artifacts with scoped paths",
    );
  }
}
const queryPlanWorkflow = validateQueryPlanWorkflow(
  parse(readFileSync(".github/workflows/query-plans.yml", "utf8")),
);
for (const command of [
  "pnpm db:plans",
  "pnpm db:plans:compare .artifacts/query-plans.json .artifacts/query-plans.json ../.artifacts/query-plans.md",
]) {
  expectRejection(
    () =>
      validateQueryPlanWorkflow({
        ...queryPlanWorkflow,
        jobs: {
          ...queryPlanWorkflow.jobs,
          "query-plans": {
            steps: queryPlanWorkflow.jobs["query-plans"]?.steps?.map((step) => {
              if (step.run?.startsWith("pnpm db:plans:compare ") === true) {
                return { ...step, run: command };
              }
              return step;
            }),
          },
        },
      }),
    "compare fresh base and proposed artifacts",
  );
}
for (const directory of ["base", "proposed"]) {
  expectRejection(
    () =>
      validateQueryPlanWorkflow({
        ...queryPlanWorkflow,
        jobs: {
          ...queryPlanWorkflow.jobs,
          "query-plans": {
            steps: queryPlanWorkflow.jobs["query-plans"]?.steps?.filter(
              (step) =>
                step.run !== "pnpm db:plans" || step["working-directory"] !== directory,
            ),
          },
        },
      }),
    "generate both branch artifacts",
  );
}
for (const inputs of [
  { "include-hidden-files": false },
  { path: ".artifacts" },
  { "if-no-files-found": "ignore" },
  { name: "unrelated-evidence" },
]) {
  expectRejection(
    () =>
      validateQueryPlanWorkflow({
        ...queryPlanWorkflow,
        jobs: {
          ...queryPlanWorkflow.jobs,
          "query-plans": {
            steps: queryPlanWorkflow.jobs["query-plans"]?.steps?.map((step) => {
              if (step.uses?.startsWith("actions/upload-artifact@") === true) {
                return { ...step, with: { ...step.with, ...inputs } };
              }
              return step;
            }),
          },
        },
      }),
    "upload hidden artifacts with scoped paths",
  );
}
for (const initialization of [
  { steps: [{ run: "echo skipped" }] },
  { if: "false", steps: [{ run: "pnpm initialization:smoke" }] },
  { steps: [{ if: "false", run: "pnpm initialization:smoke" }] },
]) {
  expectRejection(
    () =>
      validateAcceptanceWorkflow({
        ...acceptanceWorkflow,
        jobs: { ...acceptanceWorkflow.jobs, initialization },
      }),
    "smoke command unconditionally",
  );
}
expectRejection(
  () =>
    validateAcceptanceWorkflow({
      ...acceptanceWorkflow,
      jobs: {
        ...acceptanceWorkflow.jobs,
        acceptance: {
          ...acceptanceWorkflow.jobs.acceptance,
          needs: acceptanceWorkflow.jobs.acceptance?.needs?.filter(
            (gate) => gate !== "initialization",
          ),
        },
      },
    }),
  "every applicable gate",
);
expectRejection(() => validateAcceptanceWorkflow(workflow), "every applicable gate");
readProjectProfile();
const acceptance: unknown = JSON.parse(
  readFileSync("docs/features/user-registration.json", "utf8"),
);
validateAcceptance(acceptance);
expectRejection(
  () =>
    validateAcceptance({
      schemaVersion: 1,
      feature: "Negative fixture",
      owner: "fixture-owner",
      manualReview: "Independent review",
      concerns: [],
    }),
  "every concern",
);
if (
  Object.hasOwn(config.rules, "react-quality/preact-no-react-hooks") ||
  !Object.entries(config.rules).some(
    ([rule, severity]) =>
      rule === "react-quality/react-compiler-no-manual-memoization" &&
      severity === "warn",
  )
) {
  throw new Error(
    "Framework applicability must retain React Compiler and reject Preact-only advice",
  );
}
process.stdout.write("Governance positive and negative fixtures passed.\n");
