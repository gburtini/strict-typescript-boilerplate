import { layer as resourceLayer } from "@effect/opentelemetry/Resource";
import { layerGlobal, type OtelTracer } from "@effect/opentelemetry/Tracer";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { Effect, Layer } from "effect";
import { redactDatabaseParameters } from "./telemetry-exporter";

interface TelemetryOptions {
  readonly endpoint?: string;
  readonly serviceName: string;
  readonly serviceVersion?: string;
}

function createTelemetryLive(options: TelemetryOptions): Layer.Layer<OtelTracer> {
  const configuration = {
      endpoint: options.endpoint ?? "http://localhost:4318/v1/traces",
      serviceName: options.serviceName,
      serviceVersion: options.serviceVersion ?? "0.1.0",
    },
    provider = Layer.scopedDiscard(
      Effect.acquireRelease(
        Effect.sync(() => {
          const exporter = new OTLPTraceExporter({ url: configuration.endpoint }),
            safeExporter = redactDatabaseParameters(exporter),
            tracerProvider = new NodeTracerProvider({
              resource: resourceFromAttributes({
                "service.name": configuration.serviceName,
                "service.version": configuration.serviceVersion,
              }),
              spanProcessors: [new BatchSpanProcessor(safeExporter)],
            });
          tracerProvider.register();
          return tracerProvider;
        }),
        (tracerProvider) =>
          Effect.promise(tracerProvider.shutdown.bind(tracerProvider)),
      ),
    );

  return Layer.provideMerge(
    layerGlobal,
    Layer.merge(
      provider,
      resourceLayer({
        serviceName: configuration.serviceName,
        serviceVersion: configuration.serviceVersion,
      }),
    ),
  );
}

const TelemetryLive = createTelemetryLive;

export { createTelemetryLive, TelemetryLive };
export type { TelemetryOptions };
