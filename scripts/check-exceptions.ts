import { readdirSync, readFileSync, statSync } from "node:fs";
import nodePath from "node:path";
import { z } from "zod";

const configObjectSchema = z.object({
  ignorePatterns: z.array(z.string()).optional(),
  rules: z.json().optional(),
});
const rationalePattern = /(?:--|:)\s*\S+/u,
  roots = process.argv.slice(2),
  sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]),
  suppressionPattern = /(?:eslint|oxlint|ts)-disable(?:-next-line)?/u,
  violations: string[] = [];
if (roots.length === 0) {
  roots.push("apps", "packages", "scripts");
}

function collectDisabledRules(domainValue: unknown, disabledRules: Set<string>): void {
  const parsedValue = z.json().safeParse(domainValue);
  if (!parsedValue.success || typeof parsedValue.data === "string") {
    return;
  }
  const arrayValue = z.array(z.json()).safeParse(parsedValue.data);
  if (arrayValue.success) {
    for (const entry of arrayValue.data) {
      collectDisabledRules(entry, disabledRules);
    }
    return;
  }
  if (typeof parsedValue.data !== "object" || parsedValue.data === null) {
    return;
  }
  for (const [key, entry] of Object.entries(parsedValue.data)) {
    if (entry === "off") {
      disabledRules.add(key);
    }
    collectDisabledRules(entry, disabledRules);
  }
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
      fileViolations.push(`${path}:${index + 1}: suppression requires a rationale`);
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

const configPath = "oxlint.base.json";
const config = configObjectSchema.parse(JSON.parse(readFileSync(configPath, "utf8"))),
  disabledRules = new Set<string>();
collectDisabledRules(config, disabledRules);
const exceptionPolicy = readFileSync("EXCEPTIONS.md", "utf8");
for (const rule of disabledRules) {
  if (!exceptionPolicy.includes(`\`${rule}\``)) {
    violations.push(`EXCEPTIONS.md: missing registry entry for disabled rule ${rule}`);
  }
}

const { ignorePatterns } = config;
if (ignorePatterns) {
  for (const pattern of ignorePatterns) {
    if (typeof pattern === "string" && !exceptionPolicy.includes(`\`${pattern}\``)) {
      violations.push(
        `EXCEPTIONS.md: missing registry entry for ignore pattern ${pattern}`,
      );
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
}
