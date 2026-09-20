import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { retryWithPolicy } from "./retry";

function eventuallySucceeds(attempts: number): Effect.Effect<string, Error> {
  if (attempts < 3) {
    return Effect.fail(new Error("transient failure"));
  }
  return Effect.succeed("recovered");
}

function alwaysFails(): Effect.Effect<never, Error> {
  return Effect.fail(new Error("permanent failure"));
}

async function runRecoveryTest(): Promise<{
  attempts: number;
  result: string;
}> {
  let attempts = 0;
  const result = await Effect.runPromise(
    retryWithPolicy(
      Effect.suspend(() => {
        attempts += 1;
        return eventuallySucceeds(attempts);
      }),
      { attempts: 3 },
    ),
  );
  return { attempts, result };
}

async function runFailureTest(): Promise<{
  attempts: number;
  result: Exit.Exit<never, Error>;
}> {
  let attempts = 0;
  const result = await Effect.runPromiseExit(
    retryWithPolicy(
      Effect.suspend(() => {
        attempts += 1;
        return alwaysFails();
      }),
      { attempts: 1 },
    ),
  );
  return { attempts, result };
}

describe("retry behavior", () => {
  it("performs the configured total number of attempts", async () => {
    expect.hasAssertions();
    const { attempts, result } = await runRecoveryTest();

    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });

  it("does not retry when one attempt is requested", async () => {
    expect.hasAssertions();
    const { attempts, result } = await runFailureTest();

    expect(Exit.isFailure(result)).toBe(true);
    expect(attempts).toBe(1);
  });
});
