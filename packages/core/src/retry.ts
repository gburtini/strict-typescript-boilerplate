import { Effect, Schedule } from "effect";

interface RetryPolicy {
  readonly attempts: number;
}

const defaultRetryPolicy: RetryPolicy = { attempts: 3 },
  minimumAttempts = 1,
  retryWithPolicy = <Value, Failure, Requirements>(
    effect: Effect.Effect<Value, Failure, Requirements>,
    policy: RetryPolicy = defaultRetryPolicy,
  ): Effect.Effect<Value, Failure, Requirements> =>
    Effect.retry(
      effect,
      Schedule.recurs(Math.max(policy.attempts - minimumAttempts, 0)),
    );

export { defaultRetryPolicy, retryWithPolicy };
