import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app";

describe("application", () => {
  it("renders the starter screen", () => {
    expect.hasAssertions();
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /a strict React \+ TypeScript starting point\./u,
      }),
    ).toBeDefined();
  }, 5000);
});
