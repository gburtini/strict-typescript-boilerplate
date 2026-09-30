import { existsSync } from "node:fs";
import { z } from "zod";

const exactPathSchema = z
  .string()
  .regex(/^\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/u)
  .refine((path) => !path.split("/").includes(".."));
const semgrepRuleSchema = z.looseObject({
  id: z.string().min(1),
  severity: z.literal("ERROR"),
  metadata: z.strictObject({ enforcement: z.literal("boundary") }).optional(),
  paths: z.strictObject({ exclude: z.array(exactPathSchema).min(1) }).optional(),
});
const semgrepConfigurationSchema = z.strictObject({
  rules: z.array(semgrepRuleSchema).min(1),
});
const semgrepPermissionSchema = z.strictObject({
  rule: z.string().min(1),
  scope: z.array(exactPathSchema).min(1),
  reason: z.string().min(30),
  owner: z.string().min(1),
  tracking: z.string().min(1),
  evidence: z.literal("devtools/quality/semgrep/fixtures.json"),
  expiry: z.iso.date().optional(),
});
const semgrepPermissionsSchema = z.strictObject({
  schemaVersion: z.literal(1),
  permissions: z.array(semgrepPermissionSchema),
});
const semgrepFixturesSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fixtures: z
    .array(
      z.strictObject({
        path: exactPathSchema.transform((path) => path.slice(1)),
        code: z.string().min(1),
        expected: z.array(z.string().min(1)),
      }),
    )
    .min(1),
});

function permissionKey(rule: string, scope: readonly string[]): string {
  return JSON.stringify([rule, scope.toSorted()]);
}

function validateSemgrepPermissions(configuration: unknown, registry: unknown): void {
  const { rules } = semgrepConfigurationSchema.parse(configuration);
  const { permissions } = semgrepPermissionsSchema.parse(registry);
  const configured: string[] = [];
  for (const rule of rules) {
    if (Boolean(rule.paths) !== Boolean(rule.metadata)) {
      throw new Error(`Only boundary rules may have permissions: ${rule.id}`);
    }
    if (rule.paths) {
      configured.push(permissionKey(rule.id, rule.paths.exclude));
    }
  }
  const registered = permissions.map((entry) => permissionKey(entry.rule, entry.scope));
  if (
    new Set(rules.map((rule) => rule.id)).size !== rules.length ||
    new Set(registered).size !== registered.length ||
    configured.length !== registered.length ||
    configured.some((key) => !registered.includes(key))
  ) {
    throw new Error("Semgrep permissions must match approved rules and scopes exactly");
  }
  for (const entry of permissions) {
    if (
      typeof entry.expiry === "string" &&
      entry.expiry < new Date().toISOString().slice(0, 10)
    ) {
      throw new Error(`Expired Semgrep permission: ${entry.rule}`);
    }
    if (new Set(entry.scope).size !== entry.scope.length) {
      throw new Error(`Duplicate Semgrep permission paths: ${entry.rule}`);
    }
    for (const path of [...entry.scope, `/${entry.tracking}`, `/${entry.evidence}`]) {
      if (!existsSync(path.slice(1))) {
        throw new Error(`Semgrep permission references a missing file: ${path}`);
      }
    }
  }
}

export {
  semgrepConfigurationSchema,
  semgrepFixturesSchema,
  semgrepPermissionsSchema,
  validateSemgrepPermissions,
};
