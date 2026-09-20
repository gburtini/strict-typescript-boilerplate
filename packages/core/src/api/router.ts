import { implement } from "@orpc/server";
import { Effect } from "effect";
import { apiContract } from "./contract";
import { withSpan } from "../telemetry";
import { withSpanPromise } from "../telemetry-promise";

/*
 * This is the intentional transport seam: oRPC requires a Promise handler,
 * while the application computation remains an Effect program behind it.
 */
const apiRouter = implement(apiContract).router({
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

export { apiRouter };
