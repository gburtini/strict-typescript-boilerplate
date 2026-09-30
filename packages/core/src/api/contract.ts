import { oc } from "@orpc/contract";
import { z } from "zod";
import { registeredUserSchema, registrationInputSchema } from "../domain/registration";

const apiContract = oc.router({
  register: oc
    .route({ method: "POST", path: "/register" })
    .input(registrationInputSchema)
    .output(registeredUserSchema),
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
