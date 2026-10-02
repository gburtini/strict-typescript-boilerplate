import { z } from "zod";
import { parse, stringify } from "yaml";

const lockfileDependencySchema = z.object({
  specifier: z.string(),
  version: z.string(),
});
const initializationLockfileSchema = z.object({
  importers: z.record(
    z.string(),
    z.object({
      dependencies: z.record(z.string(), lockfileDependencySchema).optional(),
      devDependencies: z.record(z.string(), lockfileDependencySchema).optional(),
      optionalDependencies: z.record(z.string(), lockfileDependencySchema).optional(),
    }),
  ),
  packages: z.record(z.string(), z.json()),
  snapshots: z.record(z.string(), z.json()),
});

function externalDependencies(
  dependencies: Record<string, z.infer<typeof lockfileDependencySchema>> = {},
): Record<string, z.infer<typeof lockfileDependencySchema>> {
  return Object.fromEntries(
    Object.entries(dependencies).filter(
      ([, dependency]) => !dependency.specifier.startsWith("workspace:"),
    ),
  );
}

function resolutionFingerprint(source: string): string {
  const lockfile = initializationLockfileSchema.parse(parse(source));
  const importers = Object.fromEntries(
    Object.entries(lockfile.importers).map(([path, importer]) => [
      path,
      {
        dependencies: externalDependencies(importer.dependencies),
        devDependencies: externalDependencies(importer.devDependencies),
        optionalDependencies: externalDependencies(importer.optionalDependencies),
      },
    ]),
  );
  return stringify({ ...lockfile, importers }, { sortMapEntries: true });
}

function assertLockfileResolutionsUnchanged(before: string, after: string): void {
  if (resolutionFingerprint(before) !== resolutionFingerprint(after)) {
    throw new TypeError("Initialization must preserve dependency resolutions");
  }
}

const projectInitializationSchema = z.strictObject({
  name: z
    .string()
    .regex(/^[a-z][a-z0-9-]*$/u)
    .max(64)
    .refine((name) => name !== "typescript-boilerplate", "Choose a new project name"),
  scope: z
    .string()
    .regex(/^@[a-z][a-z0-9-]*$/u)
    .max(64)
    .refine((scope) => scope !== "@template", "Choose a new package scope"),
  title: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[\p{L}\p{N} .-]+$/u),
  database: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/u)
    .max(63)
    .refine(
      (name) =>
        !["postgres", "template0", "template1"].includes(name) &&
        !name.startsWith("planner_"),
      "Choose a product database name, outside the disposable planner namespace",
    ),
});

type ProjectInitialization = z.infer<typeof projectInitializationSchema>;

function initializeText(source: string, project: ProjectInitialization): string {
  const replacements = new Map([
    ["@template", project.scope],
    ["typescript-boilerplate", project.name],
    ["typescript_boilerplate", project.database],
    ["TypeScript Boilerplate", project.title],
  ]);
  return source.replaceAll(
    /@template|typescript-boilerplate|typescript_boilerplate|TypeScript Boilerplate/gu,
    (identity) => replacements.get(identity) ?? identity,
  );
}

export {
  initializeText,
  projectInitializationSchema,
  assertLockfileResolutionsUnchanged,
};
