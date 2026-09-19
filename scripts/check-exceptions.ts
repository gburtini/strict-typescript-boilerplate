import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["apps", "packages", "scripts"];
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const suppressionPattern = /(?:eslint|oxlint|ts)-disable(?:-next-line)?/u;
const rationalePattern = /(?:--|:)\s*\S+/u;
const violations: string[] = [];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["coverage", "dist", "node_modules"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(path);
    }
    const extension = path.slice(path.lastIndexOf("."));
    if (!sourceExtensions.has(extension)) return [];
    return [path];
  });
}

for (const root of roots) {
  if (!statSync(root, { throwIfNoEntry: false })) continue;
  for (const path of collectSourceFiles(root)) {
    const lines = readFileSync(path, "utf8").split("\n");
    for (const [index, line] of lines.entries()) {
      if (suppressionPattern.test(line) && !rationalePattern.test(line)) {
        violations.push(`${path}:${index + 1}: suppression requires a rationale`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
}
