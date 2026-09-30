import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import nodePath from "node:path";
import { z } from "zod";

const manifestSchema = z.object({
  name: z.string(),
  exports: z.record(z.string(), z.string()).optional(),
});

function sourceFile(path: string, root: string): string {
  for (const candidate of [
    path,
    `${path}.ts`,
    `${path}.tsx`,
    nodePath.join(path, "index.ts"),
  ]) {
    if (
      existsSync(candidate) &&
      statSync(candidate).isFile() &&
      realpathSync(candidate).startsWith(`${root}/`)
    ) {
      return nodePath.relative(root, candidate);
    }
  }
  return "";
}

function packageEntrypoints(root: string): Map<string, string> {
  const entrypoints = new Map<string, string>();
  for (const entry of readdirSync(nodePath.join(root, "packages"), {
    withFileTypes: true,
  })) {
    const directory = nodePath.join(root, "packages", entry.name);
    const manifestPath = nodePath.join(directory, "package.json");
    if (entry.isDirectory() && existsSync(manifestPath)) {
      const manifest = manifestSchema.parse(
        JSON.parse(readFileSync(manifestPath, "utf8")),
      );
      for (const [specifier, target] of Object.entries(manifest.exports ?? {})) {
        const suffix = specifier.replace(/^\./u, "");
        entrypoints.set(
          `${manifest.name}${suffix}`,
          nodePath.resolve(directory, target),
        );
      }
    }
  }
  return entrypoints;
}

function importedSourcePaths(
  path: string,
  root: string,
  entrypoints: ReadonlyMap<string, string>,
): string[] {
  const sourcePath = sourceFile(nodePath.resolve(root, path), root);
  if (sourcePath.length === 0 || !/\.[jt]sx?$/u.test(sourcePath)) {
    return [];
  }
  const imports: string[] = [];
  const content = readFileSync(nodePath.resolve(root, sourcePath), "utf8");
  for (const match of content.matchAll(
    /(?:from\s*|import\s*)["'](?<specifier>[^"']+)["']/gu,
  )) {
    const specifier = match.groups?.specifier ?? "";
    let target = entrypoints.get(specifier) ?? "";
    if (specifier.startsWith(".")) {
      target = nodePath.resolve(
        root,
        nodePath.dirname(path),
        specifier.replace(/\.js$/u, ".ts"),
      );
    }
    if (target.length > 0) {
      const resolved = sourceFile(target, root);
      if (resolved.length > 0) {
        imports.push(resolved);
      }
    }
  }
  return imports;
}

function relatedSourcePaths(paths: readonly string[], root: string): string[] {
  const selected = new Set(paths);
  const entrypoints = packageEntrypoints(root);
  for (let depth = 0; depth < 2; depth += 1) {
    const currentPaths = [...selected];
    for (const path of currentPaths) {
      for (const imported of importedSourcePaths(path, root, entrypoints)) {
        selected.add(imported);
      }
    }
  }
  return [...selected];
}

function nestedPolicyPaths(paths: readonly string[]): string[] {
  const policies = new Set<string>();
  for (const path of paths) {
    let directory = nodePath.dirname(path);
    while (directory !== ".") {
      policies.add(nodePath.join(directory, "AGENTS.md"));
      directory = nodePath.dirname(directory);
    }
  }
  return [...policies];
}

export { nestedPolicyPaths, relatedSourcePaths };
