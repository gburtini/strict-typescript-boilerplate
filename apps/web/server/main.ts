import { Effect } from "effect";
import { InfrastructureError } from "@template/core";
import { BodyLimitPlugin, RPCHandler } from "@orpc/server/node";
import { createApiRouter } from "@template/core/api";
import { createDatabase, createUserRepository } from "@template/db";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { serverEnv } from "./env";

function installReferenceApi(server: ViteDevServer | PreviewServer): void {
  if (serverEnv.REFERENCE_API_ENABLED !== "true") {
    return;
  }
  const database = createDatabase({ url: serverEnv.DATABASE_URL });
  const handler = new RPCHandler(createApiRouter(createUserRepository(database)), {
    plugins: [new BodyLimitPlugin({ maxBodySize: 2048 })],
  });
  server.httpServer?.once("close", () => {
    Effect.runFork(
      Effect.match(
        Effect.tryPromise({
          try: async () => {
            await database.close();
          },
          catch: (cause) =>
            new InfrastructureError("Shutdown failed", "postgres", cause),
        }),
        {
          onSuccess: () => process.stdout.write("Reference database closed.\n"),
          onFailure: () =>
            process.stderr.write("Reference database shutdown failed.\n"),
        },
      ),
    );
  });
  server.middlewares.use((request, response, next) => {
    const normalizedRequest = Object.assign(request, {
      originalUrl: request.originalUrl ?? request.url ?? "/",
    });
    Effect.runFork(
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
