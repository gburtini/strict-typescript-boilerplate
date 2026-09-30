# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: registration.browser.ts >> pending requests prevent duplicates and long content reflows
- Location: e2e/registration.browser.ts:51:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- main [ref=e3]:
    - generic [ref=e4]:
        - paragraph [ref=e5]: Opinionated by default
        - 'heading "TypeScript Boilerplate: a strict React + TypeScript starting point." [level=1] [ref=e6]'
        - paragraph [ref=e7]:
            - text: "Correctness, consistency, and design-system boundaries are checked by one command:"
            - code [ref=e8]: pnpm check:all
            - text: .
        - heading "Registration reference" [level=2] [ref=e9]
        - paragraph [ref=e10]: A local example of validation, persistence, and recovery. Do not enter personal information.
        - generic [ref=e11]:
            - generic [ref=e12]: Email address
            - textbox "Email address" [ref=e13]: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.test
            - status [ref=e14]: Saved aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.test.
            - button "Save registration" [ref=e15] [cursor=pointer]
```

# Test source

```ts
  1  | import { randomUUID } from "node:crypto";
  2  | import { expect, test } from "@playwright/test";
  3  | import { AxeBuilder } from "@axe-core/playwright";
  4  |
  5  | test("registration persists and survives retries", async ({ page }, testInfo) => {
  6  |   const email = `browser-${randomUUID()}@example.test`;
  7  |   await page.goto("/");
  8  |   await page.getByRole("textbox", { name: "Email address" }).fill(email);
  9  |   await page.getByRole("button", { name: "Save registration" }).click();
  10 |   await expect(page.getByRole("status")).toHaveText(`Saved ${email}.`);
  11 |   await page.reload();
  12 |   await page.getByRole("textbox", { name: "Email address" }).fill(email);
  13 |   await page.getByRole("button", { name: "Save registration" }).click();
  14 |   await expect(page.getByRole("status")).toHaveText(`Saved ${email}.`);
  15 |   const scan = await new AxeBuilder({ page }).analyze();
  16 |   expect(scan.violations).toEqual([]);
  17 |   await page.screenshot({ path: testInfo.outputPath("success.png"), fullPage: true });
  18 | });
  19 |
  20 | test("keyboard validation and failure preserve input for recovery", async ({
  21 |   page,
  22 | }, testInfo) => {
  23 |   await page.goto("/");
  24 |   await page.getByRole("textbox", { name: "Email address" }).focus();
  25 |   await page.keyboard.type("invalid");
  26 |   await page.keyboard.press("Tab");
  27 |   await expect(page.getByRole("button", { name: "Save registration" })).toBeFocused();
  28 |   await page.keyboard.press("Enter");
  29 |   await expect(page.getByRole("status")).toHaveText("Enter a valid email address.");
  30 |   await expect(page.getByRole("textbox", { name: "Email address" })).toBeFocused();
  31 |   await page
  32 |     .getByRole("textbox", { name: "Email address" })
  33 |     .fill("recovery@example.test");
  34 |   // Replace only the external HTTP boundary to exercise transport failure.
  35 |   await page.route("**/api/register", async (route) => {
  36 |     await route.fulfill({ status: 503 });
  37 |   });
  38 |   await page.getByRole("button", { name: "Save registration" }).click();
  39 |   await expect(page.getByRole("status")).toHaveText(
  40 |     "Registration could not be saved. Try again.",
  41 |   );
  42 |   await expect(page.getByRole("textbox", { name: "Email address" })).toHaveValue(
  43 |     "recovery@example.test",
  44 |   );
  45 |   await page.screenshot({ path: testInfo.outputPath("failure.png"), fullPage: true });
  46 |   await page.unroute("**/api/register");
  47 |   await page.getByRole("button", { name: "Save registration" }).click();
  48 |   await expect(page.getByRole("status")).toHaveText("Saved recovery@example.test.");
  49 | });
  50 |
  51 | test("pending requests prevent duplicates and long content reflows", async ({
  52 |   page,
  53 | }, testInfo) => {
  54 |   await page.goto("/");
  55 |   await page.screenshot({ path: testInfo.outputPath("initial.png"), fullPage: true });
  56 |   await page
  57 |     .getByRole("textbox", { name: "Email address" })
  58 |     .fill(`${"a".repeat(60)}@example.test`);
  59 |   const gate = Promise.withResolvers<boolean>();
  60 |   await page.route("**/api/register", async (route) => {
  61 |     await gate.promise;
  62 |     await route.continue();
  63 |   });
  64 |   await page.getByRole("button", { name: "Save registration" }).click();
  65 |   await expect(page.getByRole("status")).toHaveText("Saving registration…");
  66 |   await expect(page.getByRole("button", { name: "Save registration" })).toBeDisabled();
  67 |   gate.resolve(true);
  68 |   await expect(page.getByRole("status")).toContainText("Saved ");
  69 |   const fits = await page.evaluate(
  70 |     () => document.documentElement.scrollWidth <= globalThis.innerWidth,
  71 |   );
> 72 |   expect(fits).toBe(true);
     |                ^ Error: expect(received).toBe(expected) // Object.is equality
  73 |   await page.screenshot({
  74 |     path: testInfo.outputPath("long-content.png"),
  75 |     fullPage: true,
  76 |   });
  77 | });
  78 |
```
