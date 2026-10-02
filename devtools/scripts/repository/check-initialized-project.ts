import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import nodePath from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import { projectInitializationSchema } from "./project-initialization.ts";
import { repositoryRoot } from "../shared/repository-paths.ts";

const project = projectInitializationSchema.parse({
  name: "initialized-project",
  scope: "@initialized",
  title: "Initialized Project",
  database: "initialized_project",
});
mkdirSync(nodePath.join(repositoryRoot, ".artifacts"), { recursive: true });
const artifacts = mkdtempSync(
  nodePath.join(repositoryRoot, ".artifacts", "initialization-smoke-"),
);
const checkout = nodePath.join(artifacts, "checkout");
const cache = mkdtempSync(nodePath.join(tmpdir(), "initialization-cache-"));
const log = nodePath.join(artifacts, "smoke.log");
const sourceMetadataSchema = z.object({ name: z.string().min(1) });
const sourceMetadata = sourceMetadataSchema.parse(
  JSON.parse(readFileSync(nodePath.join(repositoryRoot, "package.json"), "utf8")),
);

function run(cwd: string, command: string, args: string[]): string {
  let invocation = args;
  if (command === "pnpm") {
    invocation = [
      `--config.store-dir=${nodePath.join(cache, "store")}`,
      `--config.cache-dir=${nodePath.join(cache, "metadata")}`,
      ...args,
    ];
  }
  const result = spawnSync(command, invocation, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16_777_216,
  });
  const output = `${result.stdout}\n${result.stderr}`.replaceAll("\0", "\n");
  appendFileSync(log, `$ ${command} ${invocation.join(" ")}\n${output}\n`);
  process.stdout.write(output);
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed in initialized-project verification`, {
      cause: result.error ?? new Error(`Exit status: ${String(result.status)}`),
    });
  }
  return result.stdout;
}

function copySources(): void {
  const files = run(repositoryRoot, "git", [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ]).split("\0");
  for (const file of files.filter((path) => path.length > 0)) {
    const target = nodePath.join(checkout, file);
    mkdirSync(nodePath.dirname(target), { recursive: true });
    cpSync(nodePath.join(repositoryRoot, file), target);
  }
}

function verifyIdentity(): void {
  const metadataSchema = z.object({ name: z.literal(project.name) });
  metadataSchema.parse(
    JSON.parse(readFileSync(nodePath.join(checkout, "package.json"), "utf8")),
  );
  const coreMetadataSchema = z.object({ name: z.literal(`${project.scope}/core`) });
  coreMetadataSchema.parse(
    JSON.parse(
      readFileSync(nodePath.join(checkout, "packages/core/package.json"), "utf8"),
    ),
  );
  if (
    !readFileSync(nodePath.join(checkout, "compose.yaml"), "utf8").includes(
      project.database,
    ) ||
    !readFileSync(nodePath.join(checkout, "apps/web/index.html"), "utf8").includes(
      project.title,
    )
  ) {
    throw new Error(
      "Initialized database and browser identities must match configuration",
    );
  }
}

function initializeCopy(): void {
  if (sourceMetadata.name !== "typescript-boilerplate") {
    process.stdout.write(
      "Project identity is already initialized; verifying a fresh project copy.\n",
    );
    return;
  }
  writeFileSync(
    nodePath.join(artifacts, "project.json"),
    `${JSON.stringify(project)}\n`,
  );
  run(checkout, "pnpm", ["init:project", nodePath.join(artifacts, "project.json")]);
  verifyIdentity();
  const fixtureScript = "devtools/scripts/repository/check-initialized-project.ts";
  if (
    readFileSync(nodePath.join(checkout, fixtureScript), "utf8") !==
    readFileSync(nodePath.join(repositoryRoot, fixtureScript), "utf8")
  ) {
    throw new Error("Initialization must preserve its smoke fixture ownership");
  }
}

try {
  copySources();
  run(checkout, "git", ["init", "--quiet"]);
  run(checkout, "git", ["add", "--", "."]);
  run(checkout, "git", [
    "-c",
    "user.name=Initialization fixture",
    "-c",
    "user.email=initialization@example.test",
    "commit",
    "--quiet",
    "-m",
    "Snapshot initialization fixture",
  ]);
  run(checkout, "pnpm", ["install", "--frozen-lockfile"]);
  initializeCopy();
  run(checkout, "pnpm", ["install", "--frozen-lockfile"]);
  run(checkout, "pnpm", ["check:all"]);
  process.stdout.write(
    `Initialized-project acceptance passed. Evidence: ${artifacts}\n`,
  );
} finally {
  const acceptanceArtifacts = nodePath.join(checkout, ".artifacts");
  try {
    if (existsSync(acceptanceArtifacts)) {
      cpSync(acceptanceArtifacts, nodePath.join(artifacts, "acceptance"), {
        recursive: true,
      });
    }
  } finally {
    try {
      rmSync(checkout, { recursive: true, force: true });
    } finally {
      rmSync(cache, { recursive: true, force: true });
    }
  }
}
