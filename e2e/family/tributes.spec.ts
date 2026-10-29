import { expect, test } from "@playwright/test";

/**
 * Family portal — tribute moderation. Uses the seeded memorial
 * `josephine-okafor` (owned by ada.owner@example.test), which has one specific
 * `pending` tribute in the seed ("…plate of food for anyone who passed").
 *
 * Note: this and the public tribute spec touch the same seeded memorial, so
 * assertions are scoped to this one tribute rather than to queue emptiness.
 */

const SEED_PENDING = "plate of food for anyone who passed";

test("owner approves the seeded pending tribute; it then appears on the public memorial", async ({
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
  await page.getByRole("link", { name: "Tributes" }).click();
  await expect(page).toHaveURL(/\/tributes$/, nav);

  const queueItem = page.getByRole("listitem").filter({ hasText: SEED_PENDING });
  await expect(queueItem).toBeVisible(nav);
  await queueItem.getByRole("button", { name: "Approve" }).click();

  // The tribute now sits under "On the memorial" with a Hide control.
  const approvedItem = page.getByRole("listitem").filter({ hasText: SEED_PENDING });
  await expect(approvedItem.getByRole("button", { name: "Hide" })).toBeVisible(nav);

  // And it is now visible on the public memorial.
  await page.goto("http://localhost:3000/josephine-okafor");
  await expect(page.getByText(SEED_PENDING)).toBeVisible(nav);
});
