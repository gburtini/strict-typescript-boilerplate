import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import nodePath from "node:path";
import { spawnSync } from "node:child_process";

const migrationDirectory = "packages/db/drizzle",
  temporaryDirectory = mkdtempSync(
    nodePath.join(process.cwd(), ".tmp-typescript-boilerplate-db-"),
  ),
  temporaryDirectoryName = nodePath.relative(process.cwd(), temporaryDirectory),
  temporaryMigrationDirectory = nodePath.join(temporaryDirectory, "drizzle"),
  temporaryConfig = nodePath.join(temporaryDirectory, "drizzle.config.ts");

function collectFiles(directory: string, root = directory): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = nodePath.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(path, root);
    }
    return [nodePath.relative(root, path)];
  });
}

function readTree(directory: string): Map<string, string> {
  return new Map(
    collectFiles(directory).map((path) => [
      path,
      readFileSync(nodePath.join(directory, path), "utf8"),
    ]),
  );
}

try {
  if (!existsSync(migrationDirectory)) {
    throw new Error(`Missing migration directory: ${migrationDirectory}`);
  }

  cpSync(migrationDirectory, temporaryMigrationDirectory, { recursive: true });
  writeFileSync(
    temporaryConfig,
    `import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  out: ${JSON.stringify(`${temporaryDirectoryName}/drizzle`)},
  schema: "packages/db/src/schema.ts",
  strict: true,
  verbose: true,
});
`,
  );
  const before = readTree(temporaryMigrationDirectory),
    result = spawnSync(
      "pnpm",
      ["exec", "drizzle-kit", "check", "--config", "packages/db/drizzle.config.ts"],
      { encoding: "utf8", stdio: "inherit" },
    );
  if (result.error || result.status !== 0) {
    throw new Error("Drizzle migration metadata is inconsistent");
  }

  const generateResult = spawnSync(
    "pnpm",
    ["exec", "drizzle-kit", "generate", "--config", temporaryConfig],
    { encoding: "utf8", stdio: "inherit" },
  );
  if (generateResult.error || generateResult.status !== 0) {
    throw new Error("Drizzle migration generation failed");
  }

  const after = readTree(temporaryMigrationDirectory),
    changedFiles = new Set([...before.keys(), ...after.keys()]),
    differences = [...changedFiles].filter(
      (path) => before.get(path) !== after.get(path),
    );
  if (differences.length > 0) {
    throw new Error(
      `Committed Drizzle migrations are stale; run pnpm db:generate: ${differences.join(", ")}`,
    );
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
