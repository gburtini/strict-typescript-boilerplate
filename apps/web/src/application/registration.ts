import type { RegistrationInput } from "@template/core";

type RegistrationResult =
  | { readonly status: "success"; readonly email: string }
  | { readonly status: "failure"; readonly message: string };
type RegistrationPort = (input: RegistrationInput) => Promise<RegistrationResult>;

export type { RegistrationResult, RegistrationPort };
