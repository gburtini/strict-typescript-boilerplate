import { spawnSync } from "node:child_process";

function run(command: string, arguments_: string[]): string {
  const result = spawnSync(command, arguments_, {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0) {
    throw new Error(`toolchain command failed: ${command}`);
  }
  return `${result.stdout}${result.stderr}`;
}

const compilerVersion = run("pnpm", ["exec", "tsc", "--version"]);
if (!/^Version 7\./mu.test(compilerVersion)) {
  throw new Error(`TypeScript 7 is required; found: ${compilerVersion.trim()}`);
}

const firstPatch = run("pnpm", [
    "exec",
    "effect-tsgo",
    "patch",
    "--oxlint",
    "--typescript",
  ]),
  secondPatch = run("pnpm", [
    "exec",
    "effect-tsgo",
    "patch",
    "--oxlint",
    "--typescript",
  ]);
if (
  !firstPatch.includes("Patched") &&
  !firstPatch.includes("skipped because its hash matches the replacement")
) {
  throw new Error("Effect toolchain patch did not report a successful application");
}
if (!secondPatch.includes("skipped because its hash matches the replacement")) {
  throw new Error("Effect toolchain patch is not idempotent");
}
