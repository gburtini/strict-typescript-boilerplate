import type { ReactElement } from "react";
import { StarterCard } from "./components/starter-card";

export function App(): ReactElement {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-8">
      <StarterCard />
    </main>
  );
}
