import { SpanStatusCode } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { describe, expect, it } from "vitest";
import { redactDatabaseParameters } from "../telemetry-exporter";

describe("telemetry export boundary", () => {
  it("preserves SDK span behavior while removing parameters and exception payloads", async () => {
    expect.hasAssertions();
    const exported: ReadableSpan[] = [];
    // The sink replaces an external collector; the real SDK creates and processes spans.
    const delegate: SpanExporter = {
      export(spans, resultCallback) {
        exported.push(...spans);
        resultCallback({ code: 0 });
      },
      shutdown: async () => {
        await Promise.resolve();
      },
    };
    const provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(redactDatabaseParameters(delegate))],
    });
    const span = provider.getTracer("test").startSpan("database.insert");
    span.setAttribute("drizzle.query.params", "secret@example.test");
    span.setAttribute("db.operation.name", "INSERT");
    span.recordException(new Error("query failed: secret@example.test"));
    span.setStatus({ code: SpanStatusCode.ERROR, message: "secret@example.test" });
    span.end();
    await provider.forceFlush();
    await provider.shutdown();
    const [result] = exported;
    expect(result?.spanContext().traceId).toHaveLength(32);
    expect(result?.attributes).toStrictEqual({ "db.operation.name": "INSERT" });
    expect(result?.status.code).toBe(SpanStatusCode.ERROR);
    expect(
      JSON.stringify({ events: result?.events, status: result?.status }),
    ).not.toContain("secret@example.test");
  });
});
