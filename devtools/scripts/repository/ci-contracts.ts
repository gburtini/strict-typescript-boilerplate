import { z } from "zod";

const stepSchema = z.looseObject({
  uses: z.string().optional(),
  run: z.string().optional(),
  if: z.string().optional(),
});
const workflowContractSchema = z.looseObject({
  on: z.record(z.string(), z.json()),
  permissions: z.record(z.string(), z.enum(["read", "write", "none"])),
  jobs: z.record(
    z.string(),
    z.looseObject({
      steps: z.array(stepSchema).optional(),
      uses: z.string().optional(),
      if: z.string().optional(),
    }),
  ),
});

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

export { requireWorkflowCommand, validateSemanticWorkflow };
