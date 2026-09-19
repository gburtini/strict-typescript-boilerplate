import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const fixtureRoot = mkdtempSync(join(tmpdir(), "typescript-architecture-"));
const domainDirectory = join(fixtureRoot, "src/domain");
const infrastructureDirectory = join(fixtureRoot, "src/infrastructure");

try {
  mkdirSync(domainDirectory, { recursive: true });
  mkdirSync(infrastructureDirectory, { recursive: true });

  writeFileSync(
    join(infrastructureDirectory, "database.ts"),
    "export const database = true;\n",
  );
  writeFileSync(
    join(domainDirectory, "policy.ts"),
    'import { database } from "../infrastructure/database";\nexport const policy = database;\n',
  );

  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "dependency-cruiser",
      "--validate",
      ".dependency-cruiser.cjs",
      fixtureRoot,
    ],
    { encoding: "utf8" },
  );
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0 || !output.includes("domain-does-not-import-outer-layers")) {
    console.error(output);
    console.error("Architecture fixture did not prove the forbidden domain import.");
    process.exitCode = 1;
  }
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
