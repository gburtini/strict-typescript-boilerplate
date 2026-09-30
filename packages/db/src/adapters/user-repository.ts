import { eq } from "drizzle-orm";
import { Effect } from "effect";
import {
  InfrastructureError,
  registeredUserSchema,
  type UserRepository,
} from "@template/core";
import type { DatabaseClient } from "../client";
import { users } from "../schema";

function createUserRepository(database: DatabaseClient): UserRepository {
  return {
    register: (input) =>
      Effect.tryPromise({
        try: async () => {
          const [inserted] = await database.db
            .insert(users)
            .values(input)
            .onConflictDoNothing({ target: users.email })
            .returning({ id: users.id, email: users.email });
          if (inserted) {
            return registeredUserSchema.parse(inserted);
          }
          const [existing] = await database.db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.email, input.email))
            .limit(1);
          return registeredUserSchema.parse(existing);
        },
        catch: (cause) =>
          new InfrastructureError("Registration could not be saved", "postgres", cause),
      }),
  };
}

export { createUserRepository };
