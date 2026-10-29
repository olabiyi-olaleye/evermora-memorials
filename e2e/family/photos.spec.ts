import { expect, test } from "@playwright/test";
import { makeNoisyPng } from "../fixtures/make-image";

/**
 * Family portal — gallery upload. The photo bytes go straight from the
 * browser to Supabase Storage (authorized by the caller's own session), then
 * a small server action validates and records them — so a large phone photo
 * no longer hits Vercel's ~4.5 MB serverless request-body ceiling. Uses the
 * seeded memorial `josephine-okafor` (owner ada.owner@example.test).
 */

test("owner uploads a large photo and it appears in the gallery", async ({ page }) => {
  test.setTimeout(120_000);
  const nav = { timeout: 45_000 };

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);

  await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await page.getByRole("link", { name: "Photos & memories" }).click();
  await expect(page).toHaveURL(/\/photos$/, nav);

  const countHeading = page.getByRole("heading", { name: /^Photos \(\d+\)$/ });
  const before = Number(/\((\d+)\)/.exec((await countHeading.textContent()) ?? "")?.[1] ?? "0");

  // ~1.5 MB of PNG noise — above the client-compression threshold, and well
  // above what the old FormData-through-the-function path could carry.
  const big = makeNoisyPng(720);
  expect(big.length).toBeGreaterThan(700_000);

  await page.locator('input[type="file"]').setInputFiles({
    name: "grandma-and-the-grandkids.png",
    mimeType: "image/png",
    buffer: big,
  });

  await expect(page.getByRole("status")).toHaveText(/1 photo added/, nav);
  await expect(countHeading).toHaveText(`Photos (${before + 1})`, nav);
});
