import { describe, expect, it } from "vitest";
import { insertUserSchema, selectUserSchema } from "./schema";

describe("database schemas", () => {
  it("accepts a valid user insert at the persistence boundary", () => {
    expect.hasAssertions();

    const result = insertUserSchema.safeParse({
      email: "person@example.com",
    });

    expect(result.success).toBeTruthy();
  });

  it("rejects invalid persisted user data", () => {
    expect.hasAssertions();

    const result = selectUserSchema.safeParse({
      createdAt: "not-a-date",
      email: "not-an-email",
      id: "not-a-uuid",
      updatedAt: "not-a-date",
    });

    expect(result.success).toBeFalsy();
  });
});
