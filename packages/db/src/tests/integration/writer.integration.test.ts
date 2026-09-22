import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDatabase } from "../../client";
import { env } from "../../env";
import { users, type User } from "../../schema";

function requireInsertedUser(user: User | undefined): User {
  if (!user) {
    throw new Error("PostgreSQL did not return the inserted user");
  }
  return user;
}

describe("database writer", () => {
  it("writes and reads a user through PostgreSQL", async () => {
    expect.hasAssertions();
    const database = createDatabase({ url: env.DATABASE_URL });
    let insertedUserId: string = randomUUID();

    try {
      const email = `integration-${randomUUID()}@example.test`;
      const insertedUsers = await database.db
        .insert(users)
        .values({ email })
        .returning();
      const insertedUser = requireInsertedUser(insertedUsers[0]);
      insertedUserId = insertedUser.id;

      const [selectedUser] = await database.db
        .select()
        .from(users)
        .where(eq(users.id, insertedUser.id));

      expect(selectedUser).toMatchObject({
        email,
        id: insertedUser.id,
      });
    } finally {
      try {
        await database.db.delete(users).where(eq(users.id, insertedUserId));
      } finally {
        await database.close();
      }
    }
  });
});
