import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import nodePath from "node:path";
import { repositoryRoot } from "./repository-paths.ts";

function gitFiles(args: string[]): string[] {
  const result = spawnSync("git", ["ls-files", ...args, "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Cannot enumerate repository sources: ${result.stderr}`, {
      cause: result.error,
    });
  }
  return result.stdout.split("\0").filter((file) => file.length > 0);
}

function readRepositoryFiles(): string[] {
  const deleted = new Set(gitFiles(["--deleted"]));
  const files = new Set(gitFiles(["--cached", "--others", "--exclude-standard"]));
  return [...files].filter((file) => !deleted.has(file));
}

function copyRepositorySources(targetRoot: string): void {
  for (const file of readRepositoryFiles()) {
    const target = nodePath.join(targetRoot, file);
    mkdirSync(nodePath.dirname(target), { recursive: true });
    cpSync(nodePath.join(repositoryRoot, file), target);
  }
}

export { copyRepositorySources, readRepositoryFiles };
