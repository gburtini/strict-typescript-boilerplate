import { oc } from "@orpc/contract";
import { z } from "zod";

const apiContract = oc.router({
  health: oc
    .route({ method: "GET", path: "/health" })
    .input(z.object({}))
    .output(
      z.object({
        service: z.string().min(1),
        status: z.literal("ok"),
      }),
    ),
});
const healthContract = apiContract.health;

export { apiContract, healthContract };
