import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

const queryParametersAttribute = "drizzle.query.params";

function safeSpan(span: ReadableSpan): ReadableSpan {
  const { [queryParametersAttribute]: _queryParameters, ...attributes } =
    span.attributes;
  const snapshot: ReadableSpan = {
    name: span.name,
    kind: span.kind,
    spanContext: () => span.spanContext(),
    startTime: span.startTime,
    endTime: span.endTime,
    status: { code: span.status.code },
    attributes,
    links: span.links,
    events: span.events.map((event) => {
      if (event.name !== "exception") {
        return event;
      }
      const eventAttributes = {
        "exception.message": "operation failed",
        "exception.type": event.attributes?.["exception.type"] ?? "Error",
      };
      return { ...event, attributes: eventAttributes };
    }),
    duration: span.duration,
    ended: span.ended,
    resource: span.resource,
    instrumentationScope: span.instrumentationScope,
    droppedAttributesCount: span.droppedAttributesCount,
    droppedEventsCount: span.droppedEventsCount,
    droppedLinksCount: span.droppedLinksCount,
  };
  if (span.parentSpanContext) {
    return { ...snapshot, parentSpanContext: span.parentSpanContext };
  }
  return snapshot;
}

function redactDatabaseParameters(delegate: SpanExporter): SpanExporter {
  return {
    export(spans: ReadableSpan[], resultCallback) {
      delegate.export(
        spans.map((span) => safeSpan(span)),
        resultCallback,
      );
    },
    async shutdown() {
      await delegate.shutdown();
    },
  };
}

export { redactDatabaseParameters };
