import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

test("registration persists and survives retries", async ({ page }, testInfo) => {
  const email = `browser-${randomUUID()}@example.test`;
  await page.goto("/");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Save registration" }).click();
  await expect(page.getByRole("status")).toHaveText(`Saved ${email}.`);
  await page.reload();
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Save registration" }).click();
  await expect(page.getByRole("status")).toHaveText(`Saved ${email}.`);
  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("success.png"), fullPage: true });
});

test("keyboard validation and failure preserve input for recovery", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Email address" }).focus();
  await page.keyboard.type("invalid");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Save registration" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Enter a valid email address.");
  await expect(page.getByRole("textbox", { name: "Email address" })).toBeFocused();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("recovery@example.test");
  // Replace only the external HTTP boundary to exercise transport failure.
  await page.route("**/api/register", async (route) => {
    await route.fulfill({ status: 503 });
  });
  await page.getByRole("button", { name: "Save registration" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Registration could not be saved. Try again.",
  );
  await expect(page.getByRole("textbox", { name: "Email address" })).toHaveValue(
    "recovery@example.test",
  );
  await page.screenshot({ path: testInfo.outputPath("failure.png"), fullPage: true });
  await page.unroute("**/api/register");
  await page.getByRole("button", { name: "Save registration" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved recovery@example.test.");
});

test("pending requests prevent duplicates and long content reflows", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.screenshot({ path: testInfo.outputPath("initial.png"), fullPage: true });
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill(`${"a".repeat(60)}@example.test`);
  const gate = Promise.withResolvers<boolean>();
  await page.route("**/api/register", async (route) => {
    await gate.promise;
    await route.continue();
  });
  await page.getByRole("button", { name: "Save registration" }).click();
  await expect(page.getByRole("status")).toHaveText("Saving registration…");
  await expect(page.getByRole("button", { name: "Save registration" })).toBeDisabled();
  gate.resolve(true);
  await expect(page.getByRole("status")).toContainText("Saved ");
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= globalThis.innerWidth,
  );
  expect(fits).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("long-content.png"),
    fullPage: true,
  });
});

test("built server serves the browser without exposing server files", async ({
  request,
}) => {
  const ready = await request.get("/readyz");
  expect(ready.status()).toBe(200);
  const head = await request.head("/");
  expect(head.headers()["content-type"]).toContain("text/html");
  expect(await head.body()).toHaveLength(0);
  const serverFile = await request.get("/server/main.mjs");
  const missingApi = await request.get("/api/missing");
  const invalidMethod = await request.post("/");
  const invalidPath = await request.get("/%E0%A4%A");
  expect(serverFile.status()).toBe(404);
  expect(missingApi.status()).toBe(404);
  expect(invalidMethod.status()).toBe(405);
  expect(invalidPath.status()).toBe(400);
});
