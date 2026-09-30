import { describe, expect, it } from "vitest";
import { registrationInputSchema } from "../domain/registration";

describe("registration boundary", () => {
  it("normalizes an email before crossing the repository port", () => {
    expect.hasAssertions();
    expect(
      registrationInputSchema.parse({ email: "  TEST@EXAMPLE.TEST  " }),
    ).toStrictEqual({
      email: "test@example.test",
    });
  });

  it("rejects malformed and oversized values", () => {
    expect.hasAssertions();
    expect(registrationInputSchema.safeParse({ email: "invalid" }).success).toBe(false);
    expect(
      registrationInputSchema.safeParse({ email: `${"a".repeat(255)}@example.test` })
        .success,
    ).toBe(false);
  });
});
