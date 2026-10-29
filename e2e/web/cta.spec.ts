import { expect, test } from "@playwright/test";

/**
 * The marketing CTAs are first-party redirect routes into the family portal.
 * In the e2e stack the family portal runs on :3001.
 */
test.describe("apps/web CTA routing", () => {
  test("Create a memorial reaches the family portal sign-up, carrying the wizard destination", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Create a memorial" }).first().click();
    await expect(page).toHaveURL(/localhost:3001\/sign-up\?next=%2Fmemorials%2Fnew/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Create your account");
  });

  test("Sign in reaches the family portal sign-in", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in" }).first().click();
    await expect(page).toHaveURL(/localhost:3001\/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  });

  test("the /create route redirects", async ({ request }) => {
    const res = await request.get("/create", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers()["location"]).toContain("/sign-up?next=");
  });
});
