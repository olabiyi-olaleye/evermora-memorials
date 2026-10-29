import { expect, test } from "@playwright/test";

test("a family member requests a service and sees it in their list", async ({ page }) => {
  test.setTimeout(120_000);
  const nav = { timeout: 45_000 };
  const marker = `Livestream setup ${Date.now().toString(36)}`;

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);

  await page.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await page.getByRole("link", { name: "Services", exact: true }).click();
  await expect(page).toHaveURL(/\/services$/, nav);

  // Name + email are pre-filled from the account.
  await expect(page.getByLabel("Email")).toHaveValue("ada.owner@example.test");

  await page.getByLabel("What do you need?").selectOption("livestream");
  await page.getByLabel("Details (optional)").fill(marker);
  await page.getByRole("button", { name: "Send request" }).click();

  await expect(page.getByText("The Evermora team will reply by email.")).toBeVisible(nav);
  await expect(page.getByRole("listitem").filter({ hasText: marker })).toBeVisible(nav);
  await expect(
    page.getByRole("listitem").filter({ hasText: marker }).getByText("Received"),
  ).toBeVisible();
});
