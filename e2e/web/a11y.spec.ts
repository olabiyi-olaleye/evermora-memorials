import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility sweep — WCAG 2.1 A/AA, axe-core. Covers the published public
 * memorial (including the tribute submission form), the marketing site, and the
 * services enquiry form.
 */

const scan = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("public memorial page has no detectable WCAG 2.1 A/AA violations", async ({ page }) => {
  await page.goto("/josephine-okafor");
  const results = await scan(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

for (const path of [
  "/",
  "/how-it-works",
  "/features",
  "/about",
  "/support",
  "/privacy",
  "/terms",
]) {
  test(`marketing ${path} has no detectable WCAG 2.1 A/AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await scan(page);
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("the services enquiry form has no detectable WCAG 2.1 A/AA violations", async ({ page }) => {
  await page.goto("/services");
  const results = await scan(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
