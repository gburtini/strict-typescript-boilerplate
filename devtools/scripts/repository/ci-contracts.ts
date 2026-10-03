import { z } from "zod";

const stepSchema = z.looseObject({
  name: z.string().optional(),
  "working-directory": z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  uses: z.string().optional(),
  run: z.string().optional(),
  if: z.string().optional(),
  with: z
    .looseObject({
      name: z.string().optional(),
      path: z.string().optional(),
      "include-hidden-files": z.boolean().optional(),
      "if-no-files-found": z.string().optional(),
    })
    .optional(),
});

function requireEvidenceUpload(
  steps: z.infer<typeof stepSchema>[],
  artifact: string,
  paths: readonly string[],
): void {
  const upload = steps.find(
    (step) =>
      step.uses?.startsWith("actions/upload-artifact@") === true &&
      step.with?.name === artifact,
  );
  if (
    upload?.if !== "always()" ||
    upload.with?.["include-hidden-files"] !== true ||
    upload.with["if-no-files-found"] !== "error" ||
    upload.with.path?.trim() !== paths.join("\n")
  ) {
    throw new TypeError(`${artifact} must upload hidden artifacts with scoped paths`);
  }
}
const workflowContractSchema = z.looseObject({
  on: z.record(z.string(), z.json()),
  permissions: z.record(z.string(), z.enum(["read", "write", "none"])),
  jobs: z.record(
    z.string(),
    z.looseObject({
      steps: z.array(stepSchema).optional(),
      uses: z.string().optional(),
      if: z.string().optional(),
      needs: z.array(z.string()).optional(),
    }),
  ),
});

function validateAcceptanceWorkflow(
  input: unknown,
): z.infer<typeof workflowContractSchema> {
  const workflow = workflowContractSchema.parse(input);
  const required = [
    "repository",
    "initialization",
    "semgrep",
    "codeql",
    "dependencies",
    "plans",
    "actionlint",
    "osv",
  ];
  const { acceptance } = workflow.jobs;
  if (
    acceptance?.if !== "always()" ||
    required.some(
      (gate) =>
        acceptance.needs?.includes(gate) !== true ||
        !Object.hasOwn(workflow.jobs, gate),
    )
  ) {
    throw new TypeError("Acceptance must depend on every applicable gate");
  }
  const { initialization } = workflow.jobs;
  if (
    typeof initialization?.if === "string" ||
    initialization?.steps?.some(
      (step) => step.run === "pnpm initialization:smoke" && typeof step.if !== "string",
    ) !== true
  ) {
    throw new TypeError("Initialization must run the smoke command unconditionally");
  }
  requireEvidenceUpload(initialization.steps ?? [], "initialized-project-evidence", [
    ".artifacts/initialization-smoke-*/smoke.log",
    ".artifacts/initialization-smoke-*/project.json",
    ".artifacts/initialization-smoke-*/acceptance",
  ]);
  requireEvidenceUpload(workflow.jobs.repository?.steps ?? [], "acceptance-evidence", [
    "apps/web/test-results",
    ".artifacts/query-corpus*.json",
    ".artifacts/query-plans.json",
    ".artifacts/query-plans.md",
    ".artifacts/regressions-*/*.json",
    ".artifacts/regressions-*/*.log",
  ]);
  return workflow;
}

function validateQueryPlanWorkflow(
  input: unknown,
): z.infer<typeof workflowContractSchema> {
  const workflow = workflowContractSchema.parse(input);
  const steps = workflow.jobs["query-plans"]?.steps ?? [];
  const base = steps.find((step) => step.name === "Generate base query plans");
  const comparison = steps.find(
    (step) => step.name === "Compare proposed query plans with base",
  );
  if (
    base?.["working-directory"] !== "proposed" ||
    base.run !== "pnpm db:plans" ||
    typeof base.if === "string" ||
    base.env?.QUERY_PLAN_CORPUS !== "../base/.artifacts/query-corpus.json" ||
    base.env.QUERY_PLAN_ARTIFACT !== "../.artifacts/query-plans-base.json" ||
    comparison?.["working-directory"] !== "proposed" ||
    comparison.run !== "pnpm db:plans" ||
    comparison.env?.QUERY_PLAN_BASELINE !== "../.artifacts/query-plans-base.json" ||
    typeof comparison.if === "string"
  ) {
    throw new TypeError("Query plans must compare fresh base and proposed artifacts");
  }
  requireEvidenceUpload(steps, "query-plan-comparison", [
    ".artifacts/query-plans-base.json",
    ".artifacts/query-plans-base.md",
    ".artifacts/query-plans.md",
    "proposed/.artifacts/query-plans.json",
    "base/.artifacts/query-corpus.json",
    "proposed/.artifacts/query-corpus.json",
  ]);
  return workflow;
}

function requireWorkflowCommand(input: unknown, command: string): void {
  const workflow = workflowContractSchema.parse(input);
  const found = Object.values(workflow.jobs).some(
    (job) =>
      job.steps?.some((step) => step.run === command && typeof step.if !== "string") ===
      true,
  );
  if (!found) {
    throw new TypeError(
      `Workflow requires an unconditional executable step: ${command}`,
    );
  }
}

function validateSemanticWorkflow(input: unknown): void {
  const workflow = workflowContractSchema.parse(input);
  if (
    Object.hasOwn(workflow.on, "pull_request") ||
    Object.hasOwn(workflow.on, "pull_request_target")
  ) {
    throw new TypeError(
      "Secret-bearing semantic evaluation cannot execute on pull requests",
    );
  }
  if (workflow.jobs.evaluate?.if !== "github.ref == 'refs/heads/main'") {
    throw new TypeError("Semantic evaluation must execute reviewed main only");
  }
}

export {
  requireWorkflowCommand,
  validateSemanticWorkflow,
  validateAcceptanceWorkflow,
  validateQueryPlanWorkflow,
};
