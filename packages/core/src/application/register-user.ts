import type { Effect } from "effect";
import type {
  RegistrationInput,
  RegisteredUser,
  UserRepository,
} from "../domain/registration";
import type { InfrastructureError } from "../infrastructure-error";
import { withSpan } from "../telemetry";

function registerUser(
  input: RegistrationInput,
  repository: UserRepository,
): Effect.Effect<RegisteredUser, InfrastructureError> {
  return withSpan("application.register-user", repository.register(input));
}

export { registerUser };
