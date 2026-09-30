import { z } from "zod";

const evidenceSchema = z.object({
  schemaVersion: z.literal(2),
  records: z
    .array(
      z.object({
        test: z.string().min(1),
        method: z.enum(["attestation", "execution"]),
        owner: z.string().min(1),
        revision: z.string().regex(/^[\da-f]{7,40}$/u),
        command: z.array(z.string().min(1)).min(1),
        redState: z.string().min(12),
        artifact: z.string().optional(),
      }),
    )
    .min(1),
});

function parseTestEvidence(
  input: unknown,
  testPaths: readonly string[],
): z.infer<typeof evidenceSchema> {
  const evidence = evidenceSchema.parse(input);
  const recorded = evidence.records.map((record) => record.test);
  if (new Set(recorded).size !== recorded.length) {
    throw new TypeError("Test evidence paths must be unique");
  }
  if (
    testPaths.some((path) => !recorded.includes(path)) ||
    recorded.some((path) => !testPaths.includes(path))
  ) {
    throw new TypeError(
      "Every test file requires current evidence; stale records are forbidden",
    );
  }
  for (const record of evidence.records) {
    if (record.method === "execution" && typeof record.artifact !== "string") {
      throw new TypeError("Execution evidence requires an inspectable artifact");
    }
  }
  return evidence;
}

export { parseTestEvidence };
