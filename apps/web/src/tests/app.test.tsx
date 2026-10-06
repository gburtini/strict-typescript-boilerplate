import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RegistrationResult } from "../application/registration";
import { App } from "../app";

async function unavailableRegistration(): Promise<RegistrationResult> {
  await Promise.resolve();
  return { status: "failure", message: "Unavailable" };
}

describe("application", () => {
  it("renders the starter screen", () => {
    expect.hasAssertions();
    render(<App register={unavailableRegistration} />);

    expect(
      screen.getByRole("heading", {
        name: /a strict React \+ TypeScript starting point\./u,
      }).textContent,
    ).toContain("TypeScript Boilerplate");
  }, 5000);
});
