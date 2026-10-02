import { RPCHandler } from "@orpc/server/fetch";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createApiRouter } from "../api/router";
import { InfrastructureError } from "../infrastructure-error";

const unavailableResponseSchema = z.object({
  json: z.object({ code: z.string(), message: z.string(), status: z.number() }),
});

describe("registration transport", () => {
  it("keeps unexpected defects internal rather than classifying them as retryable outages", async () => {
    expect.hasAssertions();
    const handler = new RPCHandler(
      createApiRouter({
        register: () => Effect.die(new Error("private programming failure")),
      }),
    );
    const result = await handler.handle(
      new globalThis.Request("http://localhost/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { email: "test@example.test" } }),
      }),
      { prefix: "/api" },
    );
    expect(result.response?.status).toBe(500);
    const response: unknown = await result.response?.json();
    expect(unavailableResponseSchema.parse(response).json.code).toBe(
      "INTERNAL_SERVER_ERROR",
    );
    expect(JSON.stringify(response)).not.toContain("private programming failure");
  });

  it("translates repository failures into the declared retryable response", async () => {
    expect.hasAssertions();
    const handler = new RPCHandler(
      createApiRouter({
        register: () =>
          Effect.fail(
            new InfrastructureError(
              "private detail",
              "postgres",
              new Error("private detail"),
            ),
          ),
      }),
    );
    const result = await handler.handle(
      new globalThis.Request("http://localhost/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { email: "test@example.test" } }),
      }),
      { prefix: "/api" },
    );
    expect(result.matched).toBe(true);
    expect(result.response?.status).toBe(503);
    const response: unknown = await result.response?.json();
    expect(unavailableResponseSchema.parse(response).json).toStrictEqual({
      code: "SERVICE_UNAVAILABLE",
      message: "Registration could not be saved. Try again.",
      status: 503,
    });
  });
});
