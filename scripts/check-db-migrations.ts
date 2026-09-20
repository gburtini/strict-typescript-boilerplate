import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const migrationDirectory = "packages/db/drizzle";
const temporaryDirectory = mkdtempSync(
  join(process.cwd(), ".tmp-typescript-boilerplate-db-"),
);
const temporaryMigrationDirectory = join(temporaryDirectory, "drizzle");
const temporaryConfig = join(temporaryDirectory, "drizzle.config.ts");
const temporaryDirectoryName = relative(process.cwd(), temporaryDirectory);

function collectFiles(directory: string, root = directory): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(path, root);
    return [relative(root, path)];
  });
}

function readTree(directory: string): Map<string, string> {
  return new Map(
    collectFiles(directory).map((path) => [
      path,
      readFileSync(join(directory, path), "utf8"),
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
  const before = readTree(temporaryMigrationDirectory);
  const result = spawnSync(
    "pnpm",
    ["exec", "drizzle-kit", "check", "--config", "packages/db/drizzle.config.ts"],
    { encoding: "utf8", stdio: "inherit" },
  );
  if (result.error !== undefined || result.status !== 0) {
    throw new Error("Drizzle migration metadata is inconsistent");
  }

  const generateResult = spawnSync(
    "pnpm",
    ["exec", "drizzle-kit", "generate", "--config", temporaryConfig],
    { encoding: "utf8", stdio: "inherit" },
  );
  if (generateResult.error !== undefined || generateResult.status !== 0) {
    throw new Error("Drizzle migration generation failed");
  }

  const after = readTree(temporaryMigrationDirectory);
  const changedFiles = new Set([...before.keys(), ...after.keys()]);
  const differences = [...changedFiles].filter(
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
