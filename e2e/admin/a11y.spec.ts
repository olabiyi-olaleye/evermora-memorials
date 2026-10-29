import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility sweep. WCAG 2.1 A/AA, axe-core. Phase 5P covered the
 * moderation queue; Phase 6A.7 extends it to the redesigned command centre
 * and the other operational screens
 * (`docs/architecture/accessibility-architecture.md`'s named target).
 */

const nav = { timeout: 45_000 };

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("staff@evermora.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);
}

async function scan(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
}

test("the command centre has no detectable WCAG 2.1 A/AA violations", async ({ page }) => {
  await signIn(page);
  const results = await scan(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

for (const [linkName, urlPattern] of [
  ["Memorials", /\/memorials/],
  ["Service requests", /\/service-requests/],
] as const) {
  test(`${linkName} has no detectable WCAG 2.1 A/AA violations`, async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: linkName, exact: true }).click();
    await expect(page).toHaveURL(urlPattern, nav);
    const results = await scan(page);
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("the reports (moderation) queue has no detectable WCAG 2.1 A/AA violations", async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page).toHaveURL(/\/reports/, nav);

  const results = await scan(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
