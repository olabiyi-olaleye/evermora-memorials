import { expect, test } from "@playwright/test";

/**
 * Platform-admin console. Signs in as the seeded staff account
 * (`staff@evermora.test` / `evermora-dev`, `is_platform_admin = true`).
 */

test("staff triage the reports queue and a service request", async ({ page }) => {
  test.setTimeout(120_000);
  const nav = { timeout: 45_000 };

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("staff@evermora.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/", nav);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible(nav);

  // Reports: resolve the seeded "inaccurate" report.
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/, nav);
  const report = page.getByRole("listitem").filter({ hasText: "birth year looks wrong" });
  await expect(report).toBeVisible(nav);
  await report.getByRole("textbox").fill("Asked the family to check the date.");
  await report.getByRole("button", { name: "Dismiss" }).click();
  await expect(
    page.getByRole("listitem").filter({ hasText: "birth year looks wrong" }),
  ).toHaveCount(0, nav);

  // Service requests: assign the seeded one to me and move it forward.
  await page.getByRole("link", { name: "Service requests", exact: true }).click();
  await expect(page).toHaveURL(/\/service-requests$/, nav);
  const req = page.getByRole("listitem").filter({ hasText: "Babatunde Balogun" });
  await expect(req).toBeVisible(nav);
  await req.getByRole("button", { name: "Assign to me" }).click();
  await expect(req.getByRole("button", { name: "Unassign me" })).toBeVisible(nav);
  await req.getByRole("combobox").selectOption("in_review");
  await expect(req.locator("select")).toHaveValue("in_review", nav);
});

test("a non-staff account is refused", async ({ page }) => {
  const nav = { timeout: 45_000 };
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("ada.owner@example.test");
  await page.getByLabel("Password").fill("evermora-dev");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Not authorised" })).toBeVisible(nav);
});
