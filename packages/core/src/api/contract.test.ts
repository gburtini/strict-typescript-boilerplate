import { describe, expect, it } from "vitest";
import { healthContract } from "./contract";

interface HealthSchemas {
  inputSchema: NonNullable<(typeof healthContract)["~orpc"]["inputSchema"]>;
  outputSchema: NonNullable<(typeof healthContract)["~orpc"]["outputSchema"]>;
}

function getHealthSchemas(): HealthSchemas {
  const metadata = healthContract["~orpc"],
    { inputSchema, outputSchema } = metadata;
  if (!inputSchema || !outputSchema) {
    throw new Error("health contract schemas are required");
  }
  return { inputSchema, outputSchema };
}

describe("health contract", () => {
  it("accepts the empty request and the declared response", () => {
    expect.hasAssertions();
    const { inputSchema, outputSchema } = getHealthSchemas();

    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(
      outputSchema.safeParse({
        service: "typescript-boilerplate",
        status: "ok",
      }).success,
    ).toBe(true);
  });

  it("rejects responses outside the runtime contract", () => {
    expect.hasAssertions();
    const { outputSchema } = getHealthSchemas();

    expect(
      outputSchema.safeParse({
        service: "typescript-boilerplate",
        status: "degraded",
      }).success,
    ).toBe(false);
  });
});
