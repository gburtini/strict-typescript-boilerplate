import { z } from "zod";

const ruleValueSchema = z.union([z.string(), z.number(), z.array(z.json())]);
const lintConfigurationSchema = z.object({
  ignorePatterns: z.array(z.string()),
  rules: z.record(z.string(), ruleValueSchema),
  overrides: z.array(
    z.object({
      files: z.array(z.string()),
      rules: z.record(z.string(), ruleValueSchema),
    }),
  ),
});
const exceptionSchema = z.object({
  kind: z.enum(["rule", "ignore"]),
  rule: z.string().min(1),
  scope: z.array(z.string().min(1)).min(1),
  value: z.json(),
  reason: z.string().min(12),
  owner: z.string().min(1),
  tracking: z.string().min(1),
  evidence: z.string().min(1),
  expiry: z.iso.date().optional(),
});
const registrySchema = z.object({
  schemaVersion: z.literal(1),
  exceptions: z.array(exceptionSchema),
});
type ExceptionRecord = z.infer<typeof exceptionSchema>;

function exceptionKey(
  record: Pick<ExceptionRecord, "kind" | "rule" | "scope" | "value">,
): string {
  return JSON.stringify([
    record.kind,
    record.rule,
    record.scope.toSorted(),
    record.value,
  ]);
}

function configuredExceptions(input: unknown): string[] {
  const configuration = lintConfigurationSchema.parse(input);
  const entries: string[] = [];
  for (const [rule, value] of Object.entries(configuration.rules)) {
    if (value === "off" || value === 0) {
      entries.push(exceptionKey({ kind: "rule", rule, scope: ["**"], value }));
    }
  }
  for (const override of configuration.overrides) {
    for (const [rule, value] of Object.entries(override.rules)) {
      entries.push(exceptionKey({ kind: "rule", rule, scope: override.files, value }));
    }
  }
  for (const pattern of configuration.ignorePatterns) {
    entries.push(
      exceptionKey({ kind: "ignore", rule: pattern, scope: ["**"], value: pattern }),
    );
  }
  return entries;
}

function validateExceptionRegistry(configuration: unknown, registry: unknown): void {
  const parsed = registrySchema.parse(registry);
  const registered = parsed.exceptions.map((entry) => exceptionKey(entry));
  if (new Set(registered).size !== registered.length) {
    throw new TypeError("Exception records must be unique");
  }
  const configured = configuredExceptions(configuration);
  if (
    configured.some((entry) => !registered.includes(entry)) ||
    registered.some((entry) => !configured.includes(entry))
  ) {
    throw new TypeError(
      "Effective lint exceptions must match approved rule values and scopes exactly",
    );
  }
  for (const entry of parsed.exceptions) {
    if (
      typeof entry.expiry === "string" &&
      entry.expiry < new Date().toISOString().slice(0, 10)
    ) {
      throw new TypeError(`Expired exception: ${entry.rule}`);
    }
  }
}

export { validateExceptionRegistry };
