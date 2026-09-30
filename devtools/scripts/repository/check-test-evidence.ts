import { existsSync, readFileSync, readdirSync } from "node:fs";
import nodePath from "node:path";
import { parseTestEvidence } from "./test-evidence.ts";

function collectTestPaths(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (
      [
        "node_modules",
        "dist",
        "coverage",
        "test-results",
        "playwright-report",
      ].includes(entry.name)
    ) {
      return [];
    }
    const path = nodePath.join(root, entry.name);
    if (entry.isDirectory()) {
      return collectTestPaths(path);
    }
    if (/\.(?:test\.[jt]sx?|browser\.ts)$/u.test(path)) {
      return [path];
    }
    return [];
  });
}

const tests = ["apps", "packages", "devtools/src/tests"].flatMap((root) =>
  collectTestPaths(root),
);
const evidence = parseTestEvidence(
  JSON.parse(readFileSync("docs/test-evidence.json", "utf8")),
  tests,
);
for (const record of evidence.records) {
  if (
    record.method === "execution" &&
    typeof record.artifact === "string" &&
    !existsSync(record.artifact)
  ) {
    throw new TypeError(`Missing red-state artifact: ${record.artifact}`);
  }
}
process.stdout.write(
  `Test evidence: ${evidence.records.filter((record) => record.method === "execution").length} execution records; ${evidence.records.filter((record) => record.method === "attestation").length} attestations requiring owner review.\n`,
);
