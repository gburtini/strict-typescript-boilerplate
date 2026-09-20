import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

const queryParametersAttribute = "drizzle.query.params";

function redactDatabaseParameters(delegate: SpanExporter): SpanExporter {
  return {
    export(spans: ReadableSpan[], resultCallback) {
      delegate.export(
        spans.map((span) => {
          const { [queryParametersAttribute]: _queryParameters, ...attributes } =
            span.attributes;
          return { ...span, attributes };
        }),
        resultCallback,
      );
    },
    async shutdown() {
      await delegate.shutdown();
    },
  };
}

export { redactDatabaseParameters };
