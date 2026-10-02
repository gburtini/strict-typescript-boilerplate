import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import nodePath from "node:path";
import { z } from "zod";
import {
  initializeText,
  projectInitializationSchema,
} from "./project-initialization.ts";
import { repositoryRoot } from "../shared/repository-paths.ts";

const initializationArgumentsSchema = z.tuple([z.string().min(1)]);
const [configurationPath] = initializationArgumentsSchema.parse(process.argv.slice(2));
const configuration: unknown = JSON.parse(readFileSync(configurationPath, "utf8"));
const project = projectInitializationSchema.parse(configuration);
const rootMetadataSchema = z.object({ name: z.literal("typescript-boilerplate") });
rootMetadataSchema.parse(JSON.parse(readFileSync("package.json", "utf8")));

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { cwd: repositoryRoot, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stdout}\n${result.stderr}`,
      { cause: result.error },
    );
  }
  return result.stdout;
}

run("git", ["diff", "--exit-code"]);
run("git", ["diff", "--cached", "--exit-code"]);
const files = run("git", [
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
])
  .split("\0")
  .filter((path) => path.length > 0);
const extensions = new Set([
  ".ts",
  ".tsx",
  ".json",
  ".yaml",
  ".yml",
  ".md",
  ".html",
  ".cjs",
  ".css",
]);
const changes: {
  readonly path: string;
  readonly before: string;
  readonly after: string;
}[] = [];
const eligibleFiles = files.filter(
  (path) =>
    extensions.has(nodePath.extname(path)) &&
    !path.startsWith("packages/db/drizzle/") &&
    !path.startsWith("docs/evidence/") &&
    path !== "docs/test-evidence.json" &&
    path !== "docs/ENFORCEMENT-MANIFEST.md" &&
    path !== "pnpm-lock.yaml" &&
    path !== "devtools/scripts/repository/project-initialization.ts" &&
    path !== "devtools/scripts/repository/initialize-project.ts" &&
    path !== "devtools/scripts/repository/check-initialization-fixtures.ts" &&
    path !== "devtools/scripts/repository/check-initialized-project.ts" &&
    path !== configurationPath,
);
for (const path of eligibleFiles) {
  const before = readFileSync(path, "utf8");
  const after = initializeText(before, project);
  if (before !== after) {
    changes.push({ path, before, after });
  }
}
const lockfileBefore = readFileSync("pnpm-lock.yaml", "utf8");
for (const change of changes) {
  writeFileSync(change.path, change.after);
}
try {
  // Pnpm owns lockfile generation; package resolution stays pinned and offline.
  process.stdout.write(run("pnpm", ["install", "--offline", "--lockfile-only"]));
  process.stdout.write(run("pnpm", ["enforcement:manifest:write"]));
  process.stdout.write(run("pnpm", ["format"]));
} catch (error) {
  for (const change of changes) {
    writeFileSync(change.path, change.before);
  }
  writeFileSync("pnpm-lock.yaml", lockfileBefore);
  throw new Error(
    "Initialization failed; source replacements restored. Inspect generated outputs with git diff before retrying.",
    { cause: error },
  );
}
process.stdout.write(
  `Initialized ${project.name} (${project.scope}) in ${changes.length} files. Run pnpm install --frozen-lockfile and pnpm check:all.\n`,
);
