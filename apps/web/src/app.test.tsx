import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./app";

describe("application", () => {
  it("renders the starter screen", () => {
    expect.hasAssertions();
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "A strict React + TypeScript starting point.",
      }),
    ).toBeDefined();
  }, 5000);
});
