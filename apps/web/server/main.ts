import { Effect, ManagedRuntime } from "effect";
import { InfrastructureError } from "@template/core";
import { BodyLimitPlugin, RPCHandler } from "@orpc/server/node";
import { createApiRouter } from "@template/core/api";
import { createTelemetryLive } from "@template/core/telemetry-node";
import { createDatabase, createUserRepository } from "@template/db";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { serverEnv } from "./env";

function installReferenceApi(server: ViteDevServer | PreviewServer): void {
  if (serverEnv.REFERENCE_API_ENABLED !== "true") {
    return;
  }
  const runtime = ManagedRuntime.make(
    createTelemetryLive({ serviceName: serverEnv.TELEMETRY_SERVICE_NAME }),
  );
  Effect.runFork(
    Effect.match(
      Effect.tryPromise({
        try: async () => {
          await runtime.runtime();
          return true;
        },
        catch: (cause) =>
          new InfrastructureError("Telemetry startup failed", "opentelemetry", cause),
      }),
      {
        onSuccess: () => process.stdout.write("Reference telemetry initialized.\n"),
        onFailure: () => process.stderr.write("Reference telemetry startup failed.\n"),
      },
    ),
  );
  const database = createDatabase({ url: serverEnv.DATABASE_URL });
  const handler = new RPCHandler(createApiRouter(createUserRepository(database)), {
    plugins: [new BodyLimitPlugin({ maxBodySize: 2048 })],
  });
  server.httpServer?.once("close", () => {
    Effect.runFork(
      Effect.match(
        Effect.tryPromise({
          try: async () => {
            await Promise.all([database.close(), runtime.dispose()]);
          },
          catch: (cause) =>
            new InfrastructureError("Shutdown failed", "reference-api", cause),
        }),
        {
          onSuccess: () => process.stdout.write("Reference API resources closed.\n"),
          onFailure: () =>
            process.stderr.write("Reference API resources failed to close cleanly.\n"),
        },
      ),
    );
  });
  server.middlewares.use((request, response, next) => {
    const normalizedRequest = Object.assign(request, {
      originalUrl: request.originalUrl ?? request.url ?? "/",
    });
    runtime.runFork(
      Effect.match(
        Effect.tryPromise({
          try: async () => {
            const result = await handler.handle(normalizedRequest, response, {
              prefix: "/api",
            });
            return { ...result };
          },
          catch: (cause) => new InfrastructureError("Request failed", "orpc", cause),
        }),
        {
          onSuccess: (result) => {
            if (!result.matched) {
              next();
            }
          },
          onFailure: (error) => {
            next(error);
          },
        },
      ),
    );
  });
}

function registrationPlugin(): Plugin {
  return {
    name: "reference-registration",
    configureServer: installReferenceApi,
    configurePreviewServer: installReferenceApi,
  };
}

export { registrationPlugin };
