import { Effect } from "effect";
import { InfrastructureError } from "@template/core";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";
import { createReferenceApi } from "./reference-api";
import { serverEnv } from "./env";

function installReferenceApi(server: ViteDevServer | PreviewServer): void {
  if (serverEnv.REFERENCE_API_ENABLED !== "true") {
    return;
  }
  const api = createReferenceApi();
  server.httpServer?.once("close", () => {
    Effect.runFork(
      Effect.match(api.close, {
        onSuccess: () => process.stdout.write("Reference API resources closed.\n"),
        onFailure: () => {
          process.stderr.write("Reference API shutdown failed.\n");
          process.exitCode = 1;
        },
      }),
    );
  });
  server.middlewares.use((request, response, next) => {
    const normalized = Object.assign(request, {
      originalUrl: request.originalUrl ?? request.url ?? "/",
    });
    Effect.runFork(
      Effect.match(
        Effect.andThen(
          api.initialize,
          Effect.tryPromise({
            try: async () => {
              const result = await api.handler.handle(normalized, response, {
                prefix: "/api",
              });
              return { ...result };
            },
            catch: (cause) => new InfrastructureError("Request failed", "orpc", cause),
          }),
        ),
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
