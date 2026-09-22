import { describe, expect, it } from "vitest";
import { ApplicationError } from "../application-error";
import { asError } from "../errors";
import { InfrastructureError } from "../infrastructure-error";

describe("error boundaries", () => {
  it("preserves an existing Error instance", () => {
    expect.hasAssertions();
    const error = asError(new Error("original"));

    expect(error.message).toBe("original");
  });

  it("wraps unknown failures with a cause", () => {
    expect.hasAssertions();
    const error = asError({ reason: "external failure" }),
      { cause } = error;

    expect(error).toBeInstanceOf(Error);
    expect(cause).toStrictEqual({ reason: "external failure" });
  });

  it("tags translated application and infrastructure failures", () => {
    expect.hasAssertions();
    const applicationError = new ApplicationError(
        "application failure",
        new Error("adapter failure"),
      ),
      infrastructureError = new InfrastructureError(
        "infrastructure failure",
        "http",
        new Error("adapter failure"),
      ),
      { cause: applicationCause } = applicationError,
      { adapter, cause: infrastructureCause } = infrastructureError;

    expect(applicationCause).toBeInstanceOf(Error);
    expect(adapter).toBe("http");
    expect(infrastructureCause).toBeInstanceOf(Error);
  });
});
