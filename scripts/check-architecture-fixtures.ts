import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import nodePath from "node:path";
import { spawnSync } from "node:child_process";

const fixtureRoot = mkdtempSync(
  nodePath.join(process.cwd(), "apps", ".architecture-fixtures-"),
);
const domainDirectory = nodePath.join(fixtureRoot, "src/domain"),
  infrastructureDirectory = nodePath.join(fixtureRoot, "src/infrastructure");

try {
  mkdirSync(domainDirectory, { recursive: true });
  mkdirSync(infrastructureDirectory, { recursive: true });

  writeFileSync(
    nodePath.join(infrastructureDirectory, "database.js"),
    "export const database = true;\n",
  );
  writeFileSync(
    nodePath.join(domainDirectory, "policy.js"),
    'import { database } from "../infrastructure/database.js";\nexport const policy = database;\n',
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
    ),
    output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0 || !output.includes("domain-does-not-import-outer-layers")) {
    process.stderr.write(`${output}\n`);
    process.stderr.write(
      "Architecture fixture did not prove the forbidden domain import.\n",
    );
    process.exitCode = 1;
  }
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
