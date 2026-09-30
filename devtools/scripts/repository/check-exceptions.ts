import { readdirSync, readFileSync, statSync } from "node:fs";
import nodePath from "node:path";
import { parse } from "yaml";
import { config } from "../../../oxlint.config.ts";
import { validateExceptionRegistry } from "./lint-exceptions.ts";
import { validateSemgrepPermissions } from "./semgrep-contracts.ts";

const rationalePattern =
    /--\s*\S.+; owner: \S+; issue: \S+; expiry: \d{4}-\d{2}-\d{2}$/u,
  roots = process.argv.slice(2),
  sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]),
  suppressionPattern = /(?:eslint|oxlint|ts)-disable(?:-next-line)?/u,
  violations: string[] = [];
if (roots.length === 0) {
  roots.push("apps", "packages", "devtools/scripts");
}

function collectSourceFiles(directory: string): string[] {
  const directoryStat = statSync(directory, { throwIfNoEntry: false });
  if (directoryStat?.isFile() === true) {
    const extension = directory.slice(directory.lastIndexOf("."));
    if (sourceExtensions.has(extension)) {
      return [directory];
    }
    return [];
  }
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["coverage", "dist", "node_modules"].includes(entry.name)) {
      return [];
    }
    const path = nodePath.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }
    const extension = path.slice(path.lastIndexOf("."));
    if (!sourceExtensions.has(extension)) {
      return [];
    }
    return [path];
  });
}

function findSuppressionViolations(path: string): string[] {
  const fileViolations: string[] = [];
  for (const [index, line] of readFileSync(path, "utf8").split("\n").entries()) {
    if (suppressionPattern.test(line) && !rationalePattern.test(line)) {
      fileViolations.push(
        `${path}:${index + 1}: suppression requires a rationale, owner, issue, and expiry`,
      );
    }
  }
  return fileViolations;
}

for (const root of roots) {
  if (statSync(root, { throwIfNoEntry: false })) {
    violations.push(
      ...collectSourceFiles(root).flatMap((sourcePath) =>
        findSuppressionViolations(sourcePath),
      ),
    );
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
}

validateExceptionRegistry(
  config,
  JSON.parse(readFileSync("devtools/quality/exceptions.json", "utf8")),
);
validateSemgrepPermissions(
  parse(readFileSync(".semgrep.yml", "utf8")),
  JSON.parse(readFileSync("devtools/quality/semgrep/permissions.json", "utf8")),
);
