import {
  ApplicationError,
  registeredUserSchema,
  type RegistrationInput,
  type RegisteredUser,
} from "@template/core";
import { Effect } from "effect";
import { z } from "zod";

const responseSchema = z.object({ json: registeredUserSchema });

function requestRegistration(
  input: RegistrationInput,
): Effect.Effect<RegisteredUser, ApplicationError> {
  return Effect.tryPromise({
    try: async () => {
      const response = await globalThis.fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: input }),
        signal: globalThis.AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error("Registration could not be saved. Try again.");
      }
      const payload: unknown = await response.json();
      return responseSchema.parse(payload).json;
    },
    catch: (cause) => new ApplicationError("Registration request failed", cause),
  });
}

export { requestRegistration };
