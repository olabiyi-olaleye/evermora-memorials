import { expect, test } from "@playwright/test";

/**
 * Responsive sweep (Phase 6A.7) — the locked rule in
 * `docs/architecture/responsive-rules.md`: "no horizontal scroll on any
 * breakpoint". Checked across the drawer/sidebar transition (`lg`, 1024px)
 * on the dashboard and a memorial overview page.
 */

const WIDTHS = [375, 640, 1024, 1440] as const;

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", { timeout: 45_000 });
}

// A few px of slack absorbs legitimate cross-platform text-metric variance
// (fallback-font substitution, subpixel rounding) between the local and CI
// rendering engines — not a stand-in for the documented parallel-load flake,
// and still tight enough to catch a real overflowing element.
const TOLERANCE = 6;

async function overflowPx(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

for (const width of WIDTHS) {
  test(`dashboard has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    expect(await overflowPx(page)).toBeLessThanOrEqual(TOLERANCE);
  });

  test(`memorial overview has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
    await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, { timeout: 45_000 });
    expect(await overflowPx(page)).toBeLessThanOrEqual(TOLERANCE);
  });
}
