import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { registerUser, registrationInputSchema } from "@template/core";
import { createUserRepository } from "../../adapters/user-repository";
import { createDatabase } from "../../client";
import { env } from "../../env";
import { users, selectUserSchema } from "../../schema";

describe("database writer", () => {
  it("writes and reads a user through PostgreSQL", async () => {
    expect.hasAssertions();
    const database = createDatabase({ url: env.DATABASE_URL });
    let insertedUserId: string = randomUUID();

    try {
      const email = `integration-${randomUUID()}@example.test`;
      const repository = createUserRepository(database);
      const registered = await Effect.runPromise(
        registerUser(registrationInputSchema.parse({ email }), repository),
      );
      const repeated = await Effect.runPromise(
        registerUser(registrationInputSchema.parse({ email }), repository),
      );
      expect(repeated).toStrictEqual(registered);
      const [row] = await database.db
        .select()
        .from(users)
        .where(eq(users.id, registered.id));
      const insertedUser = selectUserSchema.parse(row);
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
