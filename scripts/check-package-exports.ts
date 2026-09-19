import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface PackageManifest {
  exports?: Record<string, string>;
}

const packageRoots = ["packages", "apps"];
const failures: string[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(path: string): PackageManifest {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(value)) {
    throw new TypeError(`${path}: package manifest must be an object`);
  }
  const { exports } = value;
  if (exports === undefined) {
    return {};
  }
  if (!isRecord(exports)) {
    throw new TypeError(`${path}: package exports must be an object`);
  }
  const exportTargets: Record<string, string> = {};
  for (const [specifier, target] of Object.entries(exports)) {
    if (typeof target !== "string") {
      throw new TypeError(
        `${path}: package export '${specifier}' target must be a string`,
      );
    }
    exportTargets[specifier] = target;
  }
  return { exports: exportTargets };
}

for (const root of packageRoots) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageDirectory = resolve(root, entry.name);
    const packagePath = join(packageDirectory, "package.json");
    if (!existsSync(packagePath)) continue;

    const packageJson = readJson(packagePath);
    const exports = packageJson.exports;
    if (exports === undefined) continue;

    for (const [specifier, target] of Object.entries(exports)) {
      const targetPath = resolve(dirname(packagePath), target);
      if (!existsSync(targetPath)) {
        failures.push(
          `${packagePath}: export '${specifier}' points to missing '${target}'`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
