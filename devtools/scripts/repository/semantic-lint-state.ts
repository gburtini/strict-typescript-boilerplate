import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import pathModule from "node:path";
import { z } from "zod";
import type { SemanticCase } from "./semantic-lint-core.ts";

const changedPathsSchema = z.array(z.string().min(1).max(4096)),
  sourceDiffPaths = [
    "--",
    "apps",
    "packages",
    "devtools",
    "docs/policies",
    "devtools/quality",
    "package.json",
    "pnpm-workspace.yaml",
  ],
  automaticDiffExclusions = [
    ":(exclude)packages/db/drizzle/meta/**",
    ":(exclude)**/package-lock.json",
    ":(exclude)**/pnpm-lock.yaml",
    ":(exclude)**/yarn.lock",
    ":(exclude)**/bun.lockb",
    ":(exclude)**/*.lock.json",
    ":(exclude)**/*.lock.yaml",
    ":(exclude)**/.artifacts/**",
    ":(exclude)**/coverage/**",
    ":(exclude)**/dist/**",
  ];

function runGit(args: readonly string[]): string {
  return execFileSync("git", [...args], { encoding: "utf8" });
}

function readChangedPaths(args: readonly string[]): string[] {
  return changedPathsSchema.parse(
    runGit(args)
      .split("\n")
      .filter((path) => path.length > 0),
  );
}

function isSafeRepositoryFile(path: string, root: string): boolean {
  const absolutePath = pathModule.resolve(root, path),
    rootPrefix = `${root}/`;
  if (!absolutePath.startsWith(rootPrefix) || !existsSync(absolutePath)) {
    return false;
  }
  const realPath = realpathSync(absolutePath);
  return (
    realPath.startsWith(rootPrefix) &&
    !pathModule.isAbsolute(pathModule.relative(root, realPath))
  );
}

function addRelatedTestPaths(path: string, root: string, selected: Set<string>): void {
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path)) {
    return;
  }
  const extension = pathModule.extname(path),
    stem = path.slice(0, -extension.length);
  for (const testExtension of [".test.ts", ".test.tsx", ".spec.ts"]) {
    const testPath = `${stem}${testExtension}`;
    if (isSafeRepositoryFile(testPath, root)) {
      selected.add(testPath);
    }
  }
}

function readSourceContext(
  paths: readonly string[],
  root: string,
  maximumCharacters: number,
): string {
  const selected = new Set<string>(),
    sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);
  for (const path of paths) {
    if (sourceExtensions.has(pathModule.extname(path))) {
      selected.add(path);
      addRelatedTestPaths(path, root, selected);
    }
  }
  const sections: string[] = [];
  let remaining = maximumCharacters;
  for (const path of selected) {
    if (isSafeRepositoryFile(path, root)) {
      const content = readFileSync(pathModule.resolve(root, path), "utf8").slice(
          0,
          12_000,
        ),
        section = `\n--- ${path} ---\n${content}`;
      if (section.length > remaining) {
        break;
      }
      sections.push(section);
      remaining -= section.length;
    }
  }
  return sections.join("");
}

function truncateStateText(text: string, maximumCharacters: number): string {
  if (text.length <= maximumCharacters) {
    return text;
  }
  const marker = "\n[semantic review context truncated]\n";
  if (maximumCharacters <= marker.length) {
    return text.slice(0, maximumCharacters);
  }
  return `${text.slice(0, maximumCharacters - marker.length)}${marker}`;
}

function compactState(
  state: SemanticCase["state"],
  maximumStateCharacters: number,
): SemanticCase["state"] {
  if (JSON.stringify(state).length <= maximumStateCharacters) {
    return state;
  }
  let lowerBound = 0;
  let upperBound = 1;
  let bestState: SemanticCase["state"] = {
    change: "changed files are listed in the truncated semantic review state",
    relatedContext: "repository policy context was truncated",
    testContext: "test context was truncated",
  };
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const scale = (lowerBound + upperBound) / 2,
      candidate = {
        change: truncateStateText(
          state.change,
          Math.max(1, Math.floor(state.change.length * scale)),
        ),
        relatedContext: truncateStateText(
          state.relatedContext,
          Math.max(1, Math.floor(state.relatedContext.length * scale)),
        ),
        testContext: truncateStateText(
          state.testContext,
          Math.max(1, Math.floor(state.testContext.length * scale)),
        ),
      };
    if (JSON.stringify(candidate).length <= maximumStateCharacters) {
      bestState = candidate;
      lowerBound = scale;
    } else {
      upperBound = scale;
    }
  }
  return bestState;
}

function readRepositoryPolicy(root: string): string {
  return [
    "AGENTS.md",
    "docs/policies/ARCHITECTURE.md",
    "docs/policies/CONVENTIONS.md",
    "docs/policies/TESTING.md",
  ]
    .filter((path) => isSafeRepositoryFile(path, root))
    .map(
      (path) =>
        `\n--- ${path} ---\n${readFileSync(pathModule.resolve(root, path), "utf8")}`,
    )
    .join("");
}

function diffPathspecs(): readonly string[] {
  return [...sourceDiffPaths, ...automaticDiffExclusions];
}

function collectChangedPaths(base: string): string[] {
  const pathspecs = diffPathspecs(),
    committedPaths = readChangedPaths([
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      `${base}...HEAD`,
      ...pathspecs,
    ]),
    workingPaths = readChangedPaths([
      "diff",
      "--name-only",
      "--diff-filter=ACMRD",
      "HEAD",
      ...pathspecs,
    ]),
    untrackedPaths = readChangedPaths([
      "ls-files",
      "--others",
      "--exclude-standard",
      ...pathspecs,
    ]);
  return [...new Set([...committedPaths, ...workingPaths, ...untrackedPaths])];
}

function collectDiff(base: string): string {
  const pathspecs = diffPathspecs();
  return [
    runGit(["diff", "--no-ext-diff", "--unified=24", `${base}...HEAD`, ...pathspecs]),
    runGit(["diff", "--no-ext-diff", "--unified=24", "HEAD", ...pathspecs]),
  ].join("\n");
}

export function changedState(
  base: string,
  maximumStateCharacters: number,
): SemanticCase["state"] {
  const root = realpathSync(process.cwd()),
    paths = collectChangedPaths(base),
    state = {
      change: `Changed paths:\n${paths.join("\n")}\n\nDiff:\n${collectDiff(base)}`,
      relatedContext: `${readRepositoryPolicy(root)}\n\n${readSourceContext(
        paths,
        root,
        Math.floor(maximumStateCharacters / 3),
      )}`,
      testContext: readSourceContext(
        paths.filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path)),
        root,
        Math.floor(maximumStateCharacters / 3),
      ),
    };
  return compactState(state, maximumStateCharacters);
}
