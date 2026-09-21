import { existsSync, readFileSync, readdirSync } from "node:fs";
import nodePath from "node:path";
import { z } from "zod";

interface PackageManifest {
  exports?: Record<string, string> | undefined;
}

const packageRoots = ["apps", "packages"],
  failures: string[] = [];

function readJson(path: string): PackageManifest {
  const manifestSchema = z.object({
    exports: z.record(z.string(), z.string()).optional(),
  });
  try {
    return manifestSchema.parse(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    throw new TypeError(`${path}: invalid package manifest`, { cause: error });
  }
}

function missingExports(packagePath: string): string[] {
  const packageJson = readJson(packagePath);
  if (!packageJson.exports) {
    return [];
  }
  return Object.entries(packageJson.exports).flatMap(([specifier, target]) => {
    const targetPath = nodePath.resolve(nodePath.dirname(packagePath), target);
    if (existsSync(targetPath)) {
      return [];
    }
    return [`${packagePath}: export '${specifier}' points to missing '${target}'`];
  });
}

for (const root of packageRoots) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const packageDirectory = nodePath.resolve(root, entry.name),
        packagePath = nodePath.join(packageDirectory, "package.json");
      if (existsSync(packagePath)) {
        failures.push(...missingExports(packagePath));
      }
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
}
