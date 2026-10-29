import { expect, test } from "@playwright/test";

/**
 * Family portal — share + QR. Uses the seeded memorial `josephine-okafor`
 * (owner ada.owner@example.test), which is published and already has one
 * active and one retired share resolver.
 */

test("owner sees the link, generates a QR asset, and it resolves on the public site", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const nav = { timeout: 45_000 };

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);

  await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await page.getByRole("link", { name: "Share & QR" }).click();
  await expect(page).toHaveURL(/\/share$/, nav);

  // The memorial link is shown.
  await expect(page.getByText("localhost:3000/josephine-okafor")).toBeVisible(nav);

  // Generate a new QR code.
  const before = await page.getByText(/localhost:3000\/q\//).count();
  await page.getByLabel("Label (optional)").fill("E2E programme");
  await page.getByRole("button", { name: "Create a QR code" }).click();
  await expect(page.getByText("E2E programme")).toBeVisible(nav);

  const after = await page.getByText(/localhost:3000\/q\//).count();
  expect(after).toBeGreaterThan(before);

  // The new QR card carries an svg image + a download link.
  const card = page.getByRole("listitem").filter({ hasText: "E2E programme" });
  await expect(card.locator("svg")).toBeVisible();
  await expect(card.getByRole("link", { name: "Download SVG" })).toBeVisible();

  // Grab its token and confirm the public resolver redirects.
  const tokenText = await card.getByText(/localhost:3000\/q\//).innerText();
  const token = tokenText.split("/q/")[1]!.trim();
  await page.goto(`http://localhost:3000/q/${token}`);
  await expect(page).toHaveURL(/\/josephine-okafor$/, nav);
});
