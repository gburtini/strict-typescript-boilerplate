import { implement, type Router } from "@orpc/server";
import { Cause, Effect, Exit, Option } from "effect";
import { makeExternalSpan } from "@effect/opentelemetry/Tracer";
import { trace } from "@opentelemetry/api";
import { apiContract } from "./contract";
import { failTransport } from "./transport-error";
import { withSpan } from "../telemetry";
import { withSpanPromise } from "../telemetry-promise";
import { registerUser } from "@template/core";
import type { UserRepository } from "../domain/registration";

/*
 * This is the intentional transport seam: oRPC requires a Promise handler,
 * while the application computation remains an Effect program behind it.
 */
const apiRouter = implement({ health: apiContract.health }).router({
  health: implement(apiContract).health.handler(async () => {
    const healthResponse = {
        service: "typescript-boilerplate",
        status: "ok",
      } satisfies { service: string; status: "ok" },
      result = await withSpanPromise("rpc.health", async () => {
        await Effect.runPromise(
          withSpan("application.health", Effect.succeed(healthResponse)),
        );
        return healthResponse;
      });
    return { ...result };
  }),
});

type ApiRouter = Router<typeof apiContract, Record<never, never>>;

interface ApiRuntime {
  readonly run: <Value, Failure>(
    effect: Effect.Effect<Value, Failure>,
  ) => Promise<Exit.Exit<Value, Failure>>;
  readonly serviceName: string;
}

const defaultRuntime: ApiRuntime = {
  run: Effect.runPromiseExit,
  serviceName: "typescript-boilerplate",
};

function createApiRouter(
  repository: UserRepository,
  runtime: ApiRuntime = defaultRuntime,
): ApiRouter {
  return implement(apiContract).router({
    health: implement(apiContract).health.handler(async () => {
      const response = await withSpanPromise("rpc.health", async () => {
        const outcome = await runtime.run(
          withSpan(
            "application.health",
            Effect.succeed({ service: runtime.serviceName, status: "ok" }),
          ),
        );
        if (Exit.isFailure(outcome)) {
          return failTransport("INTERNAL_SERVER_ERROR", Cause.squash(outcome.cause));
        }
        return outcome.value;
      });
      return { ...response, status: "ok" };
    }),
    register: implement(apiContract).register.handler(async ({ input }) => {
      const result = await withSpanPromise("rpc.register", async () => {
        const active = trace.getActiveSpan();
        let operation = registerUser(input, repository);
        if (active) {
          operation = Effect.withParentSpan(
            operation,
            makeExternalSpan(active.spanContext()),
          );
        }
        const outcome = await runtime.run(operation);
        if (Exit.isFailure(outcome)) {
          const failure = Cause.failureOption(outcome.cause);
          if (Option.isSome(failure)) {
            return failTransport("SERVICE_UNAVAILABLE", failure.value);
          }
          return failTransport("INTERNAL_SERVER_ERROR", Cause.squash(outcome.cause));
        }
        return { ...outcome.value };
      });
      return { ...result };
    }),
  });
}

export { apiRouter, createApiRouter };
