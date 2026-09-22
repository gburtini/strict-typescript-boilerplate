import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDatabase } from "./client";
import { users } from "./schema";

const databaseUrl = process.env.DATABASE_URL;

function requireDatabaseUrl(): string {
  if (typeof databaseUrl !== "string") {
    throw new TypeError("DATABASE_URL is required for database integration tests");
  }
  return databaseUrl;
}

describe.runIf(typeof databaseUrl === "string")("database client", () => {
  it("executes representative writes and indexed reads", async () => {
    expect.hasAssertions();

    const client = createDatabase({
      maxConnections: 1,
      url: requireDatabaseUrl(),
    });
    const email = `query-plan-${randomUUID()}@example.com`;
    try {
      const [createdUser] = await client.db
        .insert(users)
        .values({ email })
        .returning({ id: users.id });
      const selectedUsers = await client.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));

      expect(selectedUsers).toStrictEqual([createdUser]);
    } finally {
      await client.close();
    }
  });
});
