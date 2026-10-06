import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RegistrationResult } from "../application/registration";
import { RegistrationForm } from "../components/registration-form";

// Component tests replace only the external persistence port; browser tests use PostgreSQL.
async function unavailableRegistration(): Promise<RegistrationResult> {
  await Promise.resolve();
  return { status: "failure", message: "Registration could not be saved. Try again." };
}
async function savedRegistration(): Promise<RegistrationResult> {
  await Promise.resolve();
  return { status: "success", email: "test@example.test" };
}

describe("registration form", () => {
  it("explains invalid input and focuses the field", async () => {
    expect.hasAssertions();
    render(<RegistrationForm register={unavailableRegistration} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save registration" }));
    await screen.findByText("Enter a valid email address.");
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Email address" }),
    );
  });

  it("preserves input after failure and lets the user recover", async () => {
    expect.hasAssertions();
    const { rerender } = render(
      <RegistrationForm register={unavailableRegistration} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "test@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save registration" }));
    await screen.findByText("Registration could not be saved. Try again.");
    expect(
      screen.getByRole("textbox", { name: "Email address" }).getAttribute("value"),
    ).toBe("test@example.test");
    rerender(<RegistrationForm register={savedRegistration} />);
    fireEvent.click(screen.getByRole("button", { name: "Save registration" }));
    await screen.findByText("Saved test@example.test.");
  });
});
