import { useState } from "react";
import { Button } from "./components/ui/button";

export function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app-shell">
      <section className="content-card" aria-labelledby="app-title">
        <p className="eyebrow">Opinionated by default</p>
        <h1 id="app-title">A strict React + TypeScript starting point.</h1>
        <p className="body-copy">
          Correctness, consistency, and design-system boundaries are checked by one
          command: <code>pnpm check</code>.
        </p>
        <Button onClick={() => setCount((value) => value + 1)}>Count: {count}</Button>
      </section>
    </main>
  );
}
