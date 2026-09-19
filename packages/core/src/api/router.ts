import { implement } from "@orpc/server";
import { Effect } from "effect";
import { apiContract } from "./contract";
import { withSpan } from "../telemetry";

const apiRouter = implement(apiContract).router({
  health: implement(apiContract).health.handler(async () => {
    const healthResponse = {
        service: "typescript-boilerplate",
        status: "ok",
      } satisfies { service: string; status: "ok" },
      result = await Effect.runPromise(
        withSpan("api.health", Effect.succeed(healthResponse)),
      );
    return result;
  }),
});

export { apiRouter };
