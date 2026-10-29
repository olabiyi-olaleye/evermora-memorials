import { expect, test } from "@playwright/test";

/**
 * Family portal — family updates. Uses the seeded memorial `josephine-okafor`
 * (owner ada.owner@example.test). The spec writes its own uniquely-named update
 * so it does not disturb the seeded updates other specs assert on.
 */

// seed: josephine-okafor. The auto-opening "Leave a tribute" prompt would
// otherwise hide the rest of the page behind aria-hidden on this test's
// first-ever visit to the public memorial.
const JOSEPHINE_ID = "e1000000-0000-4000-a000-000000000001";

test("owner writes an update, publishes it, and it appears on the public memorial", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const nav = { timeout: 45_000 };
  const title = `Order of service confirmed ${Date.now().toString(36)}`;

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);

  await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await page.getByRole("link", { name: "Family updates" }).click();
  await expect(page).toHaveURL(/\/updates$/, nav);

  await page.getByRole("button", { name: "Write an update" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Update", { exact: true }).fill("The service will proceed as planned.");
  await page.getByRole("button", { name: "Save draft" }).click();

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
});
