import { readFileSync } from "node:fs";
import { config } from "../../../oxlint.config.ts";
import { expectRejection } from "../shared/expect-rejection.ts";
import { validateExceptionRegistry } from "./lint-exceptions.ts";
import { parseTestEvidence } from "./test-evidence.ts";
import { requireWorkflowCommand, validateSemanticWorkflow } from "./ci-contracts.ts";

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
process.stdout.write("Governance positive and negative fixtures passed.\n");
