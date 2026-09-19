import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

interface GeneratedFile {
  output: string;
  source: string;
  checkCommand: string[];
}

interface GeneratedManifest {
  files: GeneratedFile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function readManifest(): GeneratedManifest {
  const value: unknown = JSON.parse(readFileSync("generated-files.json", "utf8"));
  if (!isRecord(value) || !Array.isArray(value.files))
    throw new TypeError("generated-files.json is invalid");
  const files: GeneratedFile[] = [];
  for (const entry of value.files) {
    if (
      !isRecord(entry) ||
      typeof entry.output !== "string" ||
      typeof entry.source !== "string" ||
      !isStringArray(entry.checkCommand) ||
      entry.checkCommand.length === 0
    ) {
      throw new TypeError(
        "each generated file requires output, source, and checkCommand",
      );
    }
    files.push({
      output: entry.output,
      source: entry.source,
      checkCommand: entry.checkCommand,
    });
  }
  return { files };
}

for (const file of readManifest().files) {
  if (!existsSync(resolve(file.source)) || !existsSync(resolve(file.output))) {
    throw new Error(`generated file manifest entry is missing: ${file.output}`);
  }

  const [command, ...arguments_] = file.checkCommand;
  if (command === undefined) {
    throw new TypeError(`generated file check command is empty: ${file.output}`);
  }
  const result = spawnSync(command, arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(`generated file freshness check failed: ${file.output}`);
  }
}
