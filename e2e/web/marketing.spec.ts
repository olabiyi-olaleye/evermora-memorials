import { expect, test } from "@playwright/test";

const ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/how-it-works", heading: /Four small steps/ },
  { path: "/features", heading: /done carefully/ },
  { path: "/about", heading: /A permanent home for a life/ },
  { path: "/services", heading: /Support for the practical details/ },
  { path: "/support", heading: /Getting help with a memorial/ },
  { path: "/privacy", heading: /Privacy at Evermora/ },
  { path: "/terms", heading: /Terms of use/ },
];

test.describe("apps/web marketing", () => {
  for (const { path, heading } of ROUTES) {
    test(`${path} renders`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
      await expect(page.getByRole("contentinfo")).toBeVisible();
    });
  }

  test("primary nav links reach their pages", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" }).first();
    await nav.getByRole("link", { name: "How it works" }).click();
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("footer links are all valid", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const hrefs = await footer
      .getByRole("link")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).getAttribute("href")).filter(Boolean),
      );
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
      const res = await page.request.get(href!);
      expect(res.status(), `${href} should not 404`).toBeLessThan(400);
    }
  });

  test("mobile menu opens and navigates", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Features" }).click();
    await expect(page).toHaveURL(/\/features$/);
  });

  test("robots and sitemap are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    expect(xml).toContain("/how-it-works");
    expect(xml).not.toContain("/q/");
  });
});
