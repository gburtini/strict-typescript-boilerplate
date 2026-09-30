import { z } from "zod";
import type { Effect } from "effect";
import type { InfrastructureError } from "../infrastructure-error";

const registrationInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});
const registeredUserSchema = z.object({
  id: z.uuid().brand<"UserId">(),
  email: z.email(),
});
type RegistrationInput = z.infer<typeof registrationInputSchema>;
type RegisteredUser = z.infer<typeof registeredUserSchema>;

interface UserRepository {
  readonly register: (
    input: RegistrationInput,
  ) => Effect.Effect<RegisteredUser, InfrastructureError>;
}

export { registrationInputSchema, registeredUserSchema };
export type { RegisteredUser, RegistrationInput, UserRepository };
