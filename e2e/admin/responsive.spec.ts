import { expect, test } from "@playwright/test";

/**
 * Responsive sweep (Phase 6A.7) — admin is desktop-first but "must remain
 * usable on a tablet" (`docs/architecture/responsive-rules.md`). Checked at
 * tablet through wide-desktop widths on the command centre and the
 * memorials table (the densest screen).
 */

const WIDTHS = [768, 1024, 1440, 1920] as const;

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("staff@evermora.test");
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
  test(`command centre has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    expect(await overflowPx(page)).toBeLessThanOrEqual(TOLERANCE);
  });

  test(`memorials table has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    // Navigate directly rather than through the nav link — below `lg` it
    // lives inside the (closed) mobile drawer.
    await page.goto("/memorials");
    expect(await overflowPx(page)).toBeLessThanOrEqual(TOLERANCE);
  });
}
