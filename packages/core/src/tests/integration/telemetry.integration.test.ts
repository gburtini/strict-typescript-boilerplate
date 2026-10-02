import { once } from "node:events";
import { createServer } from "node:http";
import { trace, context } from "@opentelemetry/api";
import { RPCHandler } from "@orpc/server/fetch";
import { Effect, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createApiRouter } from "../../api/router";
import { InfrastructureError } from "../../infrastructure-error";
import { createTelemetryLive } from "../../telemetry-node";

const collectorChunkSchema = z.instanceof(globalThis.Buffer);
const collectorAddressSchema = z.object({
  address: z.string(),
  family: z.string(),
  port: z.number(),
});

const exportedSpanSchema = z.object({
  name: z.string(),
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  status: z.object({ code: z.number().optional() }),
});
const traceEnvelopeSchema = z.object({
  resourceSpans: z.array(
    z.object({
      resource: z.object({
        attributes: z.array(
          z.object({
            key: z.string(),
            value: z.object({ stringValue: z.string().optional() }),
          }),
        ),
      }),
      scopeSpans: z.array(
        z.object({
          scope: z.object({ name: z.string() }),
          spans: z.array(exportedSpanSchema),
        }),
      ),
    }),
  ),
});

async function startCollector(): Promise<{
  readonly server: ReturnType<typeof createServer>;
  readonly documents: z.infer<typeof traceEnvelopeSchema>[];
  readonly payloads: string[];
  readonly endpoint: string;
}> {
  const documents: z.infer<typeof traceEnvelopeSchema>[] = [];
  const payloads: string[] = [];
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: unknown) => {
      chunks.push(collectorChunkSchema.parse(chunk));
    });
    request.on("end", () => {
      const payload = globalThis.Buffer.concat(chunks).toString("utf8");
      documents.push(traceEnvelopeSchema.parse(JSON.parse(payload)));
      payloads.push(payload);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("{}");
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = collectorAddressSchema.parse(server.address());
  return {
    server,
    documents,
    payloads,
    endpoint: `http://127.0.0.1:${address.port}/v1/traces`,
  };
}

describe("otlp collector boundary", () => {
  it("flushes contextual success and failure spans without private query values", async () => {
    expect.hasAssertions();
    const { server, documents, payloads, endpoint } = await startCollector();
    const runtime = ManagedRuntime.make(
      createTelemetryLive({
        serviceName: "collector-fixture",
        endpoint,
      }),
    );
    try {
      await runtime.runtime();
      const handler = new RPCHandler(
        createApiRouter(
          {
            // The port replaces an external database; no live DB is needed to verify transport/trace propagation.
            register: () =>
              Effect.withSpan(
                Effect.fail(
                  new InfrastructureError(
                    "secret@example.test",
                    "postgres",
                    new Error("secret@example.test"),
                  ),
                ),
                "database.insert",
              ),
          },
          {
            run: runtime.runPromiseExit.bind(runtime),
            serviceName: "collector-fixture",
          },
        ),
      );
      const tracer = trace.getTracer("@template/core");
      const success = tracer.startSpan("successful-query");
      success.setAttribute("drizzle.query.params", "secret@example.test");
      success.end();
      const parent = tracer.startSpan("incoming-request");
      const result = await context.with(
        trace.setSpan(context.active(), parent),
        async () => {
          const reply = await handler.handle(
            new globalThis.Request("http://localhost/api/register", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ json: { email: "test@example.test" } }),
            }),
            { prefix: "/api" },
          );
          return { ...reply };
        },
      );
      parent.end();
      expect(result.response?.status).toBe(503);
    } finally {
      await runtime.dispose();
      const closed = once(server, "close");
      server.close();
      await closed;
      trace.disable();
      context.disable();
    }
    const spans = documents.flatMap((envelope) =>
      envelope.resourceSpans.flatMap((resource) =>
        resource.scopeSpans.flatMap((scope) => scope.spans),
      ),
    );
    const incoming = exportedSpanSchema.parse(
      spans.find((span) => span.name === "incoming-request"),
    );
    const rpc = exportedSpanSchema.parse(
      spans.find((span) => span.name === "rpc.register"),
    );
    const application = exportedSpanSchema.parse(
      spans.find((span) => span.name === "application.register-user"),
    );
    const database = exportedSpanSchema.parse(
      spans.find((span) => span.name === "database.insert"),
    );
    expect(spans.some((span) => span.name === "successful-query")).toBe(true);
    expect({
      rpcParent: rpc.parentSpanId,
      applicationParent: application.parentSpanId,
      databaseParent: database.parentSpanId,
      traceCount: new Set([
        incoming.traceId,
        rpc.traceId,
        application.traceId,
        database.traceId,
      ]).size,
      failure: database.status.code,
      scopes: [
        ...new Set(
          documents.flatMap((envelope) =>
            envelope.resourceSpans.flatMap((resource) =>
              resource.scopeSpans.map((scope) => scope.scope.name),
            ),
          ),
        ),
      ],
    }).toStrictEqual({
      rpcParent: incoming.spanId,
      applicationParent: rpc.spanId,
      databaseParent: application.spanId,
      traceCount: 1,
      failure: 2,
      scopes: ["@template/core"],
    });
    expect(payloads.join("\n")).toContain("collector-fixture");
    expect(payloads.join("\n")).not.toContain("secret@example.test");
  });
});
