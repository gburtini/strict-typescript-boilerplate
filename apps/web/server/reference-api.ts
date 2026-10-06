import { Effect, ManagedRuntime } from "effect";
import { InfrastructureError } from "@template/core";
import { BodyLimitPlugin, RPCHandler } from "@orpc/server/node";
import { createApiRouter } from "@template/core/api";
import { createTelemetryLive } from "@template/core/telemetry-node";
import { createDatabase, createUserRepository } from "@template/db";
import { serverEnv } from "./env";
import metadata from "../package.json";

interface ReferenceApi {
  readonly handler: RPCHandler<Record<string, never>>;
  readonly initialize: Effect.Effect<void, InfrastructureError>;
  readonly ready: () => Promise<void>;
  readonly close: Effect.Effect<void, InfrastructureError>;
}

function createReferenceApi(): ReferenceApi {
  const runtime = ManagedRuntime.make(
    createTelemetryLive({
      serviceName: serverEnv.TELEMETRY_SERVICE_NAME,
      serviceVersion: metadata.version,
      endpoint: serverEnv.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    }),
  );
  const database = createDatabase({ url: serverEnv.DATABASE_URL });
  const router = createApiRouter(createUserRepository(database), {
    run: runtime.runPromiseExit.bind(runtime),
    serviceName: serverEnv.TELEMETRY_SERVICE_NAME,
  });
  const handler = new RPCHandler(router, {
    plugins: [new BodyLimitPlugin({ maxBodySize: 2048 })],
  });
  return {
    handler,
    ready: database.ping,
    initialize: Effect.asVoid(
      Effect.tryPromise({
        try: async () => {
          await runtime.runtime();
          await database.ping();
        },
        catch: (cause) =>
          new InfrastructureError("Telemetry startup failed", "opentelemetry", cause),
      }),
    ),
    close: Effect.ensuring(
      Effect.tryPromise({
        try: async () => {
          await database.close();
        },
        catch: (cause) =>
          new InfrastructureError("Database shutdown failed", "postgres", cause),
      }),
      Effect.promise(runtime.dispose.bind(runtime)),
    ),
  };
}

export { createReferenceApi };

export type { ReferenceApi };
