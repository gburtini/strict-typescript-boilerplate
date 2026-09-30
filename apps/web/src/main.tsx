import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Effect, flow } from "effect";
import type { RegistrationInput } from "@template/core";
import type { RegistrationResult } from "./application/registration";
import { requestRegistration } from "./adapters/registration-client";
import { App } from "./app";
import "./styles.css";

function registrationProgram(
  input: RegistrationInput,
): Effect.Effect<RegistrationResult> {
  return Effect.match(requestRegistration(input), {
    onSuccess: (user): RegistrationResult => ({
      status: "success",
      email: user.email,
    }),
    onFailure: (): RegistrationResult => ({
      status: "failure",
      message: "Registration could not be saved. Try again.",
    }),
  });
}

const register = flow(registrationProgram, Effect.runPromise);

const rootElement = Effect.runSync(
  Effect.fromNullable(document.querySelector("#root")),
);

createRoot(rootElement).render(
  <StrictMode>
    <App register={register} />
  </StrictMode>,
);
