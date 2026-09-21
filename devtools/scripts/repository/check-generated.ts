import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import nodePath from "node:path";
import { z } from "zod";

interface GeneratedFile {
  output: string;
  source: string;
  checkCommand: string[];
}

interface GeneratedManifest {
  files: GeneratedFile[];
}

const generatedFileSchema = z.object({
    checkCommand: z.array(z.string()).min(1),
    output: z.string(),
    source: z.string(),
  }),
  generatedManifestSchema = z.object({
    files: z.array(generatedFileSchema),
  });

function readManifest(): GeneratedManifest {
  return generatedManifestSchema.parse(
    JSON.parse(readFileSync("generated-files.json", "utf8")),
  );
}

for (const file of readManifest().files) {
  if (
    !existsSync(nodePath.resolve(file.source)) ||
    !existsSync(nodePath.resolve(file.output))
  ) {
    throw new Error(`generated file manifest entry is missing: ${file.output}`);
  }

  const [command, ...arguments_] = file.checkCommand;
  if (typeof command !== "string" || command.length === 0) {
    throw new TypeError(`generated file check command is empty: ${file.output}`);
  }
  const result = spawnSync(command, arguments_, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) {
    throw new Error(`generated file freshness check failed: ${file.output}`);
  }
}
