import { expect, test } from "@playwright/test";

test.describe("apps/web smoke", () => {
  test("home page renders the marketing site", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Evermora/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Create a lasting place to remember",
    );
    // real site chrome, not a placeholder
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create a memorial" }).first()).toBeVisible();
  });

  test("health route handler responds", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });
});
