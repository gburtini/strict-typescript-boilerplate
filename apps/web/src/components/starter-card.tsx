import { Button, Card, Input, Label } from "@template/ui";
import type { ReactElement } from "react";

export function StarterCard(): ReactElement {
  return (
    <Card aria-labelledby="app-title">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
        Opinionated by default
      </p>
      <h1
        className="max-w-xl text-4xl leading-none text-foreground sm:text-6xl"
        id="app-title"
      >
        A strict React + TypeScript starting point.
      </h1>
      <p className="my-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Correctness, consistency, and design-system boundaries are checked by one
        command:{" "}
        <code className="rounded bg-background px-1.5 py-0.5 text-sm text-primary">
          pnpm check:all
        </code>
        .
      </p>
      <Label htmlFor="example-input">Primitive input</Label>
      <Input id="example-input" placeholder="Use a design-system primitive" />
      <Button type="button">A typed design-system primitive</Button>
    </Card>
  );
}
