import { randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { z } from "zod";

const developmentEndpointSchema = z.object({
  host: z.literal("127.0.0.1"),
  port: z.coerce.number().int().min(1).max(65_535),
});
const developmentExitSchema = z.tuple([z.number().nullable(), z.string().nullable()]);
const project = `strict-dev-${randomUUID()}`;

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
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

function stopChild(child: ChildProcess): void {
  child.kill("SIGTERM");
}

try {
  run("pnpm", ["check:runtime"]);
  run("env", [
    "POSTGRES_DB=typescript_boilerplate",
    "docker",
    "compose",
    "--file",
    "compose.yaml",
    "--project-name",
    project,
    "up",
    "-d",
    "--wait",
    "postgres",
  ]);
  const [host, port] = run("env", [
    "POSTGRES_DB=typescript_boilerplate",
    "docker",
    "compose",
    "--file",
    "compose.yaml",
    "--project-name",
    project,
    "port",
    "postgres",
    "5432",
  ])
    .trim()
    .split(":");
  const endpoint = developmentEndpointSchema.parse({ host, port });
  const databaseConfiguration = `DATABASE_URL=postgresql://postgres:postgres@${endpoint.host}:${endpoint.port}/typescript_boilerplate`;
  process.stdout.write("Applying migrations before development startup.\n");
  run("env", [databaseConfiguration, "pnpm", "db:migrate"]);
  const child = spawn(
    "env",
    [
      databaseConfiguration,
      "REFERENCE_API_ENABLED=true",
      "pnpm",
      "--filter",
      "@template/web",
      "dev",
    ],
    { stdio: "inherit" },
  );
  const lifecycle = { stopping: false };
  const stop = (): void => {
    lifecycle.stopping = true;
    stopChild(child);
  };
  process.stdout.write(
    "Development database is disposable; stop the server to release it.\n",
  );
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  try {
    const [code, signal] = developmentExitSchema.parse(await once(child, "exit"));
    if (code !== 0 && signal !== "SIGTERM" && !lifecycle.stopping) {
      throw new Error(`Development server exited: ${String(code)} ${String(signal)}`);
    }
  } finally {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
} finally {
  run("env", [
    "POSTGRES_DB=typescript_boilerplate",
    "docker",
    "compose",
    "--file",
    "compose.yaml",
    "--project-name",
    project,
    "down",
    "--volumes",
    "--remove-orphans",
  ]);
}
