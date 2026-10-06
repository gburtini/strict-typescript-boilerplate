import { Card } from "@template/ui";
import type { ReactElement } from "react";
import { RegistrationForm } from "./registration-form";
import type { RegistrationPort } from "../application/registration";

const STARTER_PRODUCT_NAME = "TypeScript Boilerplate";

interface StarterCardProps {
  readonly register: RegistrationPort;
}

export function StarterCard({ register }: StarterCardProps): ReactElement {
  return (
    <Card aria-labelledby="app-title">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
        Opinionated by default
      </p>
      <h1
        className="max-w-xl text-4xl leading-none text-foreground sm:text-6xl"
        id="app-title"
      >
        {STARTER_PRODUCT_NAME}: a strict React + TypeScript starting point.
      </h1>
      <p className="my-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Correctness, consistency, and design-system boundaries are checked by one
        command:{" "}
        <code className="rounded bg-background px-1.5 py-0.5 text-sm text-primary">
          pnpm check:all
        </code>
        .
      </p>
      <h2 className="text-xl font-semibold">Registration reference</h2>
      <p className="text-base text-muted-foreground">
        A local example of validation, persistence, and recovery. Do not enter personal
        information.
      </p>
      <RegistrationForm register={register} />
    </Card>
  );
}
