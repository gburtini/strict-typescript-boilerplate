import { existsSync, readFileSync, readdirSync } from "node:fs";
import { z } from "zod";

const profileSchema = z.object({
  schemaVersion: z.literal(1),
  frameworks: z.array(
    z.enum([
      "react",
      "vite",
      "nextjs",
      "preact",
      "react-native",
      "tanstack-query",
      "tanstack-start",
    ]),
  ),
  capabilities: z.array(z.enum(["browser", "database"])),
  designBrief: z.string().min(1),
  acceptance: z.string().min(1),
});
const workspaceSchema = z.object({
  dependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
});

function validateFrameworks(profile: z.infer<typeof profileSchema>): void {
  for (const entry of readdirSync("apps", { withFileTypes: true })) {
    const manifestPath = `apps/${entry.name}/package.json`;
    if (entry.isDirectory() && existsSync(manifestPath)) {
      const manifest = workspaceSchema.parse(
        JSON.parse(readFileSync(manifestPath, "utf8")),
      );
      for (const [dependency, framework] of [
        ["react", "react"],
        ["next", "nextjs"],
        ["preact", "preact"],
        ["react-native", "react-native"],
        ["vite", "vite"],
        ["@tanstack/react-query", "tanstack-query"],
        ["@tanstack/react-start", "tanstack-start"],
      ] as const) {
        if (
          Object.hasOwn(
            { ...manifest.dependencies, ...manifest.devDependencies },
            dependency,
          ) &&
          !profile.frameworks.includes(framework)
        ) {
          throw new TypeError(`${manifestPath} requires framework ${framework}`);
        }
      }
      if (
        Object.hasOwn(manifest.dependencies, "react") &&
        !Object.hasOwn(manifest.devDependencies, "babel-plugin-react-compiler")
      ) {
        throw new TypeError(`${manifestPath} requires React Compiler`);
      }
    }
  }
}

const concerns = [
  "loading",
  "empty",
  "success",
  "validation",
  "failure",
  "permission",
  "duplicate-submission",
  "keyboard-focus",
  "destructive-action",
  "responsive-long-content",
  "reduced-motion",
] as const;
const acceptanceSchema = z.object({
  schemaVersion: z.literal(1),
  feature: z.string().min(1),
  owner: z.string().min(1),
  manualReview: z.string().min(1),
  concerns: z.array(
    z.object({
      concern: z.enum(concerns),
      behavior: z.string().min(20),
      tests: z.array(z.string().min(1)),
      notApplicable: z.boolean(),
    }),
  ),
});

function validateAcceptance(input: unknown): void {
  const acceptance = acceptanceSchema.parse(input);
  const listed = new Set(acceptance.concerns.map((entry) => entry.concern));
  if (listed.size !== concerns.length || listed.size !== acceptance.concerns.length) {
    throw new TypeError("Acceptance must cover every concern exactly once");
  }
  for (const entry of acceptance.concerns) {
    if (!entry.notApplicable && entry.tests.length === 0) {
      throw new TypeError(`Missing behavioral evidence for ${entry.concern}`);
    }
    for (const test of entry.tests) {
      if (!existsSync(test)) {
        throw new TypeError(`Missing acceptance test ${test}`);
      }
    }
  }
}

function readProjectProfile(): z.infer<typeof profileSchema> {
  const profile = profileSchema.parse(
    JSON.parse(readFileSync("project-profile.json", "utf8")),
  );
  if (new Set(profile.capabilities).size !== profile.capabilities.length) {
    throw new TypeError("Project capabilities must be unique");
  }
  for (const [capability, path] of [
    ["browser", "apps/web/package.json"],
    ["database", "packages/db/src/schema.ts"],
  ] as const) {
    if (existsSync(path) && !profile.capabilities.includes(capability)) {
      throw new TypeError(`${path} requires the ${capability} capability`);
    }
  }
  for (const path of [profile.designBrief, profile.acceptance]) {
    if (!existsSync(path)) {
      throw new TypeError(`Missing project acceptance artifact: ${path}`);
    }
  }
  validateFrameworks(profile);
  validateAcceptance(JSON.parse(readFileSync(profile.acceptance, "utf8")));
  return profile;
}

export { readProjectProfile, validateAcceptance };
