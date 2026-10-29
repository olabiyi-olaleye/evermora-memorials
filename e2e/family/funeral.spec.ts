import { expect, test } from "@playwright/test";

/**
 * Family portal — funeral management. Uses the seeded memorial
 * `josephine-okafor` (owner ada.owner@example.test), which already has two
 * published events, one draft and one members-only event.
 *
 * The spec adds its own uniquely-named event so it does not depend on, or
 * disturb, the seeded events other specs assert on.
 */

// seed: josephine-okafor. The auto-opening "Leave a tribute" prompt would
// otherwise hide the rest of the page behind aria-hidden on this test's
// first-ever visit to the public memorial.
const JOSEPHINE_ID = "e1000000-0000-4000-a000-000000000001";

test("owner adds a funeral event, publishes it, and it appears on the public memorial", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const nav = { timeout: 45_000 };
  const title = `Graveside Prayers ${Date.now().toString(36)}`;

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);

  await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await page.getByRole("link", { name: "Funeral", exact: true }).click();
  await expect(page).toHaveURL(/\/funeral$/, nav);

  // Seeded events are listed.
  await expect(page.getByText("Service of Songs").first()).toBeVisible(nav);

  await page.getByRole("button", { name: "Add an event" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Date").fill("2026-08-15");
  await page.getByLabel("Town / city").fill("Enugu");
  // A full Google Maps link resolves in the browser (no network); the pin's
  // marker (!3d/!4d) wins over the viewport centre (@…).
  await page
    .getByLabel("Map pin (optional)")
    .fill(
      "https://www.google.com/maps/place/Graveside/@6.45,7.5,17z/data=!3m1!4b1!3d6.4402!4d7.4943",
    );
  await page.getByRole("button", { name: "Set pin" }).click();
  await expect(page.getByText("Pin set: 6.4402, 7.4943")).toBeVisible();
  await page.getByRole("button", { name: "Add event" }).click();

  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible(nav);
  await expect(row.getByText("Draft")).toBeVisible();
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(row.getByText("Published", { exact: false })).toBeVisible(nav);

  await page.addInitScript((id) => {
    window.localStorage.setItem(
      `evermora.tribute.${id}`,
      JSON.stringify({ skippedAt: Date.now() }),
    );
  }, JOSEPHINE_ID);
  await page.goto("http://localhost:3000/josephine-okafor");
  await expect(page.getByRole("heading", { name: title })).toBeVisible(nav);
  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) });
  await expect(card.getByRole("link", { name: "Directions" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/dir/?api=1&destination=6.4402,7.4943",
  );
});
