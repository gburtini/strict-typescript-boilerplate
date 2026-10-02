import { readFileSync } from "node:fs";
import { config } from "../../../oxlint.config.ts";
import { expectRejection } from "../shared/expect-rejection.ts";
import { validateExceptionRegistry } from "./lint-exceptions.ts";
import { parseTestEvidence } from "./test-evidence.ts";
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
const record = {
  test: "owner/src/tests/behavior.test.ts",
  method: "attestation",
  owner: "fixture-owner",
  revision: "abcdef0",
  command: ["pnpm", "test:unit"],
  redState: "Removing the boundary validation must reject the fixture.",
};
parseTestEvidence({ schemaVersion: 2, records: [record] }, [record.test]);
expectRejection(
  () =>
    parseTestEvidence({ schemaVersion: 2, records: [record] }, [
      record.test,
      "unrecorded.test.ts",
    ]),
  "Every test file",
);
expectRejection(
  () =>
    parseTestEvidence(
      { schemaVersion: 2, records: [{ ...record, method: "execution" }] },
      [record.test],
    ),
  "inspectable artifact",
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
