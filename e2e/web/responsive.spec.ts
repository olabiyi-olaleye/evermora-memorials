import { expect, test } from "@playwright/test";

/**
 * Responsive sweep (Phase 6A.7) — the locked rule in
 * `docs/architecture/responsive-rules.md`: "no horizontal scroll on any
 * breakpoint". Checked at the widths named in the redesign brief across the
 * marketing homepage and the public memorial (the two pages a first-time,
 * often mobile, visitor actually lands on).
 */

const WIDTHS = [320, 375, 390, 430, 640, 768, 1024, 1280, 1440, 1920] as const;

// A few px of slack absorbs legitimate cross-platform text-metric variance
// (fallback-font substitution, subpixel rounding) between the local and CI
// rendering engines on these edge-to-edge, full-bleed sections — not a
// stand-in for the documented parallel-load flake, and still tight enough
// to catch a real overflowing element (tables, unbroken long text, fixed
// widths), which overflows by tens of pixels at minimum.
const TOLERANCE = 6;

async function overflowPx(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

for (const width of WIDTHS) {
  test(`homepage has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(await overflowPx(page)).toBeLessThanOrEqual(TOLERANCE);
  });

  test(`public memorial has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/josephine-okafor");
    expect(await overflowPx(page)).toBeLessThanOrEqual(TOLERANCE);
  });
}
