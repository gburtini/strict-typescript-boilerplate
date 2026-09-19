import type { ReactElement } from "react";
import { StarterCard } from "./components/starter-card";

export function App(): ReactElement {
  return (
    <main className="app-shell">
      <StarterCard />
    </main>
  );
}
