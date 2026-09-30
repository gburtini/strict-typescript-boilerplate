import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { z } from "zod";
import { readProjectProfile } from "../repository/check-project-profile.ts";

const project = `strict-check-${randomUUID()}`;
const databaseEndpointSchema = z.object({
  host: z.literal("127.0.0.1"),
  port: z.coerce.number().int().min(1).max(65_535),
});

function run(
  command: string,
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const result = spawnSync(command, args, { encoding: "utf8", env: environment });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stdout}\n${result.stderr}`,
      { cause: result.error },
    );
  }
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return result.stdout;
}

function clearCaptureShards(): void {
  for (const entry of readdirSync(".artifacts", { withFileTypes: true })) {
    if (entry.isFile() && /^query-corpus(?:-\d+)?\.json$/u.test(entry.name)) {
      rmSync(`.artifacts/${entry.name}`);
    }
  }
}

try {
  mkdirSync(".artifacts", { recursive: true });
  clearCaptureShards();
  run("docker", [
    "compose",
    "--project-name",
    project,
    "up",
    "-d",
    "--wait",
    "postgres",
  ]);
  const endpoint = run("docker", [
    "compose",
    "--project-name",
    project,
    "port",
    "postgres",
    "5432",
  ])
    .trim()
    .split(":");
  const parsed = databaseEndpointSchema.parse({ host: endpoint[0], port: endpoint[1] });
  const url = `postgresql://postgres:postgres@${parsed.host}:${parsed.port}/typescript_boilerplate`;
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: url,
    QUERY_PLAN_DATABASE_URL: url,
    QUERY_PLAN_CAPTURE: "1",
    QUERY_PLAN_CORPUS_DIR: ".artifacts",
    REFERENCE_API_ENABLED: "true",
  };
  process.stdout.write(
    `Verifying isolated database at ${parsed.host}:${parsed.port}\n`,
  );
  run("pnpm", ["db:migrate"], environment);
  run("pnpm", ["db:plans:prepare"], environment);
  run("pnpm", ["--filter", "@template/db", "test:integration"], environment);
  run("pnpm", ["db:query-corpus:merge"], environment);
  run("pnpm", ["db:plans"], environment);
  if (readProjectProfile().capabilities.includes("browser")) {
    run("pnpm", ["build"], environment);
    if (readProjectProfile().frameworks.includes("react")) {
      run("pnpm", ["compiler:check"], environment);
    }
    run("pnpm", ["test:e2e"], environment);
  }
  run("pnpm", ["db:query-corpus:merge"], environment);
  run("pnpm", ["db:plans"], environment);
} finally {
  run("docker", [
    "compose",
    "--project-name",
    project,
    "down",
    "--volumes",
    "--remove-orphans",
  ]);
}
