import { implement, ORPCError, type Router } from "@orpc/server";
import { Effect } from "effect";
import { apiContract } from "./contract";
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

function createApiRouter(repository: UserRepository): ApiRouter {
  return implement(apiContract).router({
    health: apiRouter.health,
    register: implement(apiContract).register.handler(async ({ input }) => {
      const result = await withSpanPromise("rpc.register", async () => {
        const user = await Effect.runPromise(
          Effect.mapError(
            registerUser(input, repository),
            (cause) =>
              new ORPCError("SERVICE_UNAVAILABLE", {
                message: "Registration could not be saved. Try again.",
                cause,
              }),
          ),
        );
        return { ...user };
      });
      return { ...result };
    }),
  });
}

export { apiRouter, createApiRouter };
