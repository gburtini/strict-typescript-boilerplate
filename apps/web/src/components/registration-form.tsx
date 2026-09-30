import { registrationInputSchema } from "@template/core";
import { Button, Input, Label } from "@template/ui";
import {
  useActionState,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import type { RegistrationResult, RegistrationPort } from "../application/registration";

interface RegistrationFormProps {
  readonly register: RegistrationPort;
}
type RegistrationState = RegistrationResult | { readonly status: "idle" };

function registrationMessage(state: RegistrationState, pending: boolean): string {
  if (pending) {
    return "Saving registration…";
  }
  if (state.status === "success") {
    return `Saved ${state.email}.`;
  }
  if (state.status === "failure") {
    return state.message;
  }
  return "Use a test email. Repeat registration returns the same saved user.";
}

function RegistrationForm({ register }: RegistrationFormProps): ReactElement {
  const [email, setEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  async function saveRegistration(
    _previous: RegistrationState,
    data: FormData,
  ): Promise<RegistrationState> {
    const parsed = registrationInputSchema.safeParse({ email: data.get("email") });
    if (!parsed.success) {
      inputRef.current?.focus();
      return { status: "failure", message: "Enter a valid email address." };
    }
    const result = await register(parsed.data);
    if (result.status === "failure") {
      inputRef.current?.focus();
    }
    return result;
  }
  const [state, action, pending] = useActionState(saveRegistration, { status: "idle" });
  function changeEmail(event: ChangeEvent<HTMLInputElement>): void {
    setEmail(event.target.value);
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Label htmlFor="registration-email">Email address</Label>
      <Input
        autoComplete="email"
        aria-describedby="registration-status"
        aria-invalid={state.status === "failure"}
        id="registration-email"
        name="email"
        onChange={changeEmail}
        readOnly={pending}
        ref={inputRef}
        type="email"
        value={email}
      />
      <output
        className="break-words text-sm text-muted-foreground"
        id="registration-status"
      >
        {registrationMessage(state, pending)}
      </output>
      <Button disabled={pending} type="submit">
        Save registration
      </Button>
    </form>
  );
}

export { RegistrationForm };
