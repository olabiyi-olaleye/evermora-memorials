import { expect, test } from "@playwright/test";

/**
 * Family portal — family access. Uses seeded memorial `josephine-okafor`
 * (owner ada.owner@example.test). `tunde.draft@example.test` (password
 * evermora-dev) is a real user with no membership on this memorial.
 */

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", { timeout: 45_000 });
}

async function openFamily(page: import("@playwright/test").Page) {
  await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, { timeout: 45_000 });
  await page.getByRole("link", { name: "Family access", exact: true }).click();
  await expect(page).toHaveURL(/\/family$/, { timeout: 45_000 });
}

test("owner invites a member who then accepts and lands on the memorial", async ({ page }) => {
  test.setTimeout(150_000);
  const nav = { timeout: 45_000 };

  await signIn(page, "ada.owner@example.test");
  await openFamily(page);

  // Invite Tunde (a real user, not yet a member).
  await page.getByLabel("Their email").fill("tunde.draft@example.test");
  await page.getByLabel("Role", { exact: true }).selectOption("content_editor");
  await page.getByRole("button", { name: "Send invitation" }).click();

  const inviteRow = page.getByRole("listitem").filter({ hasText: "tunde.draft@example.test" });
  await expect(inviteRow).toBeVisible(nav);
  const linkText = await inviteRow.getByText(/\/invite\//).innerText();
  const invitePath = linkText.slice(linkText.indexOf("/invite/"));

  // Ada also changes Chidi's role.
  const chidiRow = page.getByRole("listitem").filter({ hasText: "Chidi" });
  await chidiRow.getByRole("combobox").selectOption("viewer");
  await expect(page.getByText("Something went wrong.")).toHaveCount(0);

  // Tunde signs in and accepts.
  await page.context().clearCookies();
  await signIn(page, "tunde.draft@example.test");
  await page.goto(invitePath);
  await expect(page.getByRole("heading", { name: "Josephine Adaeze Okafor" })).toBeVisible(nav);
  await page.getByRole("button", { name: "Accept invitation" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await expect(page.getByRole("link", { name: "Their story" })).toBeVisible(nav);
});
