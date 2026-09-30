import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { registrationInputSchema } from "@template/core";
import { requestRegistration } from "../adapters/registration-client";

const input = registrationInputSchema.parse({ email: "client@example.test" });
const user = { id: "fdc93d8a-bc9e-4a65-9668-f606b0414723", email: input.email };

describe("registration HTTP adapter", () => {
  it("decodes the external response", async () => {
    expect.hasAssertions();
    // HTTP is the external boundary; unit tests prohibit real outbound requests.
    vi.stubGlobal("fetch", async (): Promise<Response> => {
      await Promise.resolve();
      return globalThis.Response.json({ json: user });
    });
    await expect(Effect.runPromise(requestRegistration(input))).resolves.toStrictEqual(
      user,
    );
  });

  it("reports an unavailable external service", async () => {
    expect.hasAssertions();
    // Replace the external HTTP response, not the parser or application logic.
    vi.stubGlobal("fetch", async (): Promise<Response> => {
      await Promise.resolve();
      return new globalThis.Response("Unavailable", { status: 503 });
    });
    await expect(Effect.runPromise(requestRegistration(input))).rejects.toThrow(
      "Registration request failed",
    );
  });

  it("rejects malformed external data", async () => {
    expect.hasAssertions();
    // The untrusted external HTTP payload must fail domain decoding.
    vi.stubGlobal("fetch", async (): Promise<Response> => {
      await Promise.resolve();
      return globalThis.Response.json({
        json: { id: "not-an-id", email: input.email },
      });
    });
    await expect(Effect.runPromise(requestRegistration(input))).rejects.toThrow(
      "Registration request failed",
    );
  });
});
