import { ORPCError } from "@orpc/server";

function failTransport(
  code: "SERVICE_UNAVAILABLE" | "INTERNAL_SERVER_ERROR",
  cause: unknown,
): never {
  let message = "Internal server error";
  if (code === "SERVICE_UNAVAILABLE") {
    message = "Registration could not be saved. Try again.";
  }
  // Throw at the Promise transport seam, after the Effect runner has returned.
  throw new ORPCError(code, { message, cause });
}

export { failTransport };
