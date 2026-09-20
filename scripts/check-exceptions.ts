import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = process.argv.slice(2);
if (roots.length === 0) roots.push("apps", "packages", "scripts");
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const suppressionPattern = /(?:eslint|oxlint|ts)-disable(?:-next-line)?/u;
const rationalePattern = /(?:--|:)\s*\S+/u;
const violations: string[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectDisabledRules(value: unknown, disabledRules: Set<string>): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectDisabledRules(entry, disabledRules);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (entry === "off") disabledRules.add(key);
    collectDisabledRules(entry, disabledRules);
  }
}

function collectSourceFiles(directory: string): string[] {
  const directoryStat = statSync(directory, { throwIfNoEntry: false });
  if (directoryStat?.isFile() === true) {
    const extension = directory.slice(directory.lastIndexOf("."));
    if (sourceExtensions.has(extension)) return [directory];
    return [];
  }
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

const configPath = "oxlint.base.json";
const config: unknown = JSON.parse(readFileSync(configPath, "utf8"));
if (!isRecord(config)) throw new TypeError(`${configPath} must be an object`);
const disabledRules = new Set<string>();
collectDisabledRules(config, disabledRules);
const exceptionPolicy = readFileSync("EXCEPTIONS.md", "utf8");
for (const rule of disabledRules) {
  if (!exceptionPolicy.includes(`\`${rule}\``)) {
    violations.push(`EXCEPTIONS.md: missing registry entry for disabled rule ${rule}`);
  }
}

const ignorePatterns = config.ignorePatterns;
if (Array.isArray(ignorePatterns)) {
  for (const pattern of ignorePatterns) {
    if (typeof pattern === "string" && !exceptionPolicy.includes(`\`${pattern}\``)) {
      violations.push(
        `EXCEPTIONS.md: missing registry entry for ignore pattern ${pattern}`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
}
