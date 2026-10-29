import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility sweep. WCAG 2.1 A/AA, axe-core. Phase 5P covered sign-in and
 * the creation wizard; Phase 6A.7 extends it to the redesigned dashboard and
 * memorial screens (`docs/architecture/accessibility-architecture.md`'s
 * named targets).
 */

const nav = { timeout: 45_000 };

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);
}

async function scan(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
}

test("the dashboard has no detectable WCAG 2.1 A/AA violations", async ({ page }) => {
  await signIn(page);
  const results = await scan(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("a memorial overview has no detectable WCAG 2.1 A/AA violations", async ({ page }) => {
  await signIn(page);
  await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await expect(page).toHaveTitle(/Josephine Adaeze Okafor/, nav);
  const results = await scan(page);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

for (const [linkName, urlPattern] of [
  ["Basic information", /\/edit$/],
  ["Tributes", /\/tributes$/],
  ["Family access", /\/family$/],
  ["Share & QR", /\/share$/],
] as const) {
  test(`${linkName} has no detectable WCAG 2.1 A/AA violations`, async ({ page }) => {
    await signIn(page);
    await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
    await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
    await page.getByRole("link", { name: linkName }).click();
    await expect(page).toHaveURL(urlPattern, nav);
    await expect(page).toHaveTitle(new RegExp(linkName), nav);
    const results = await scan(page);
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("sign-in has no detectable WCAG 2.1 A/AA violations", async ({ page }) => {
  await page.goto("/sign-in");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("the memorial creation wizard has no detectable WCAG 2.1 A/AA violations", async ({
  page,
}) => {
  const nav = { timeout: 45_000 };
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);
  await page.getByRole("main").getByRole("link", { name: "New memorial" }).first().click();
  await expect(page).toHaveURL(/\/memorials\/new/, nav);
  await expect(page).toHaveTitle(/Create a memorial/, nav);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
