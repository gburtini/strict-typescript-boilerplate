import type { ReactElement } from "react";
import { StarterCard } from "./components/starter-card";

import type { RegistrationPort } from "./application/registration";

interface AppProps {
  readonly register: RegistrationPort;
}

export function App({ register }: AppProps): ReactElement {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-8">
      <StarterCard register={register} />
    </main>
  );
}
