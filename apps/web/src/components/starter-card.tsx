import { Button, Card, Input, Label } from "@template/ui";
import type { ReactElement } from "react";

export function StarterCard(): ReactElement {
  return (
    <Card aria-labelledby="app-title">
      <p className="eyebrow">Opinionated by default</p>
      <h1 id="app-title">A strict React + TypeScript starting point.</h1>
      <p className="body-copy">
        Correctness, consistency, and design-system boundaries are checked by one
        command: <code>pnpm check</code>.
      </p>
      <Label htmlFor="example-input">Primitive input</Label>
      <Input id="example-input" placeholder="Use a design-system primitive" />
      <Button type="button">A typed design-system primitive</Button>
    </Card>
  );
}
