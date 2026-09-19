import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

test("starter screen has no accessibility violations", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "A strict React + TypeScript starting point.",
    }),
  ).toBeVisible();

  const accessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScan.violations).toEqual([]);
});
