import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const packageRoots = ["packages", "apps"];
const failures = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

for (const root of packageRoots) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packageDirectory = resolve(root, entry.name);
    const packagePath = join(packageDirectory, "package.json");
    if (!existsSync(packagePath)) continue;

    const packageJson = readJson(packagePath);
    const exports = packageJson.exports;
    if (!exports || typeof exports !== "object") continue;

    for (const [specifier, target] of Object.entries(exports)) {
      if (typeof target !== "string") {
        failures.push(
          `${packagePath}: export '${specifier}' must have a string target`,
        );
        continue;
      }
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
