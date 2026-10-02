import { createServer } from "node:http";
import nodePath from "node:path";
import { Effect } from "effect";
import { InfrastructureError, withSpanPromise } from "@template/core";
import { serverEnv } from "../env";
import { createReferenceApi, type ReferenceApi } from "../reference-api";
import { respond } from "../http-response";
import { loadImmutableAssets } from "../static-assets";

const root = nodePath.resolve(import.meta.dirname, "..");
function apiOptions(): { readonly api?: ReferenceApi } {
  if (serverEnv.REFERENCE_API_ENABLED === "true") {
    return { api: createReferenceApi() };
  }
  return {};
}
const resources = apiOptions();
const { api } = resources;
const immutableAssets = loadImmutableAssets(root);
let stopping = false;
const server = createServer((request, response) => {
  Effect.runFork(
    Effect.match(
      Effect.tryPromise({
        try: async () => {
          await withSpanPromise("http.request", async () => {
            await respond(request, response, {
              ...resources,
              root,
              stopping,
              immutableAssets: await immutableAssets,
            });
          });
        },
        catch: (cause) => new InfrastructureError("HTTP request failed", "http", cause),
      }),
      {
        onSuccess: () => {
          // The transport has ended the response.
        },
        onFailure: (error) => {
          process.stderr.write("HTTP request failed.\n");
          if (!response.headersSent) {
            let status = 500;
            if (request.url?.split("?")[0] === "/readyz") {
              status = 503;
            }
            if (error.cause instanceof URIError) {
              status = 400;
            }
            response.writeHead(status);
          }
          response.end("Internal server error");
        },
      },
    ),
  );
});

function shutdown(): void {
  if (stopping) {
    return;
  }
  stopping = true;
  const timeout = globalThis.setTimeout(() => server.closeAllConnections(), 5000);
  timeout.unref();
  const closed = Effect.async<boolean, InfrastructureError>((resume) => {
    function finish(error?: Error): void {
      if (error) {
        resume(
          Effect.fail(new InfrastructureError("HTTP shutdown failed", "http", error)),
        );
      } else {
        resume(Effect.succeed(true));
      }
    }
    server.close(finish);
  });
  let release: Effect.Effect<void, InfrastructureError> = Effect.void;
  if (api) {
    release = api.close;
  }
  Effect.runFork(
    Effect.match(
      Effect.onExit(closed, () =>
        Effect.match(release, {
          onSuccess: () => process.stdout.write("API resources closed.\n"),
          onFailure: () => {
            process.stderr.write("API shutdown failed.\n");
            process.exitCode = 1;
          },
        }),
      ),
      {
        onSuccess: () => {
          globalThis.clearTimeout(timeout);
        },
        onFailure: () => {
          globalThis.clearTimeout(timeout);
          process.stderr.write("HTTP shutdown failed.\n");
          process.exitCode = 1;
        },
      },
    ),
  );
}

server.on("error", (error) => {
  const { message } = error;
  process.stderr.write(`HTTP server failed: ${message}\n`);
  process.exitCode = 1;
  shutdown();
});
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.once(signal, shutdown);
}
let initialize: Effect.Effect<void, InfrastructureError> = Effect.asVoid(
  Effect.tryPromise({
    try: async () => {
      await immutableAssets;
    },
    catch: (cause) =>
      new InfrastructureError("Asset manifest failed", "static-assets", cause),
  }),
);
if (api) {
  const { initialize: apiInitialize } = api;
  initialize = Effect.zipRight(initialize, apiInitialize);
}
Effect.runFork(
  Effect.matchCause(initialize, {
    onSuccess: () => {
      if (stopping) {
        return;
      }
      server.listen(serverEnv.PORT, serverEnv.HOST, () => {
        process.stdout.write(
          `Listening on http://${serverEnv.HOST}:${serverEnv.PORT}\n`,
        );
      });
    },
    onFailure: () => {
      process.stderr.write("Server startup failed.\n");
      process.exitCode = 1;
      shutdown();
    },
  }),
);
