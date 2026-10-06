import { z } from "zod";
import type { Effect } from "effect";
import type { InfrastructureError } from "../infrastructure-error";

const registrationInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});
const userIdSchema = z.uuid().brand<"UserId">();
const registeredUserSchema = z.object({
  id: userIdSchema,
  email: z.email(),
});
type RegistrationInput = z.infer<typeof registrationInputSchema>;
type RegisteredUser = z.infer<typeof registeredUserSchema>;
type UserId = z.infer<typeof userIdSchema>;

interface UserRepository {
  readonly register: (
    input: RegistrationInput,
  ) => Effect.Effect<RegisteredUser, InfrastructureError>;
}

export { registrationInputSchema, registeredUserSchema, userIdSchema };
export type { RegisteredUser, RegistrationInput, UserId, UserRepository };
