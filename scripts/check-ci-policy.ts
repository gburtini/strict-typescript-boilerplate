import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const shaPinnedAction = /uses:\s+[^\s@]+@[0-9a-f]{40}(?:\s|$)/u;
const mutableAction = /uses:\s+[^\s@]+@[^\s#]+/u;
const failures: string[] = [];

for (const file of readdirSync(".github/workflows")) {
  if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
  const path = join(".github/workflows", file);
  const contents = readFileSync(path, "utf8");
  for (const [index, line] of contents.split("\n").entries()) {
    if (mutableAction.test(line) && !shaPinnedAction.test(line)) {
      failures.push(
        `${path}:${index + 1}: action must be pinned to a 40-character commit SHA`,
      );
    }
  }
  if (/permissions:\s*\n\s+write-all/u.test(contents)) {
    failures.push(`${path}: workflow must not grant write-all permissions`);
  }
}

const actionlintWorkflow = readFileSync(".github/workflows/actionlint.yml", "utf8");
if (!actionlintWorkflow.includes("rhysd/actionlint@")) {
  failures.push(".github/workflows/actionlint.yml: actionlint is not configured");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
