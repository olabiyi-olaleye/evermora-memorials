import { expect, test } from "@playwright/test";

/**
 * Family portal — authentication, memorial creation, editing, privacy, publish.
 *
 * Runs against the local Supabase stack (`supabase start`) with the seeded
 * account `ada.owner@example.test` / `evermora-dev`. Each run creates a
 * memorial under a unique slug so repeat runs don't collide.
 */

const SEEDED_EMAIL = "ada.owner@example.test";
const SEEDED_PASSWORD = "evermora-dev";

test.describe("family portal", () => {
  test("unauthenticated visitor is sent to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("sign in, create, edit, set privacy, publish", async ({ page }) => {
    // Generous budget: both apps build+serve in parallel and the DB-backed
    // Server Actions contend for resources during the run.
    test.setTimeout(120_000);
    const nav = { timeout: 45_000 };
    const unique = Date.now().toString(36);
    const fullName = `Test Person ${unique}`;
    const slug = `test-person-${unique}`;

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(SEEDED_EMAIL);
    await page.getByLabel("Password").fill(SEEDED_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/", nav);
    await page.getByRole("main").getByRole("link", { name: "New memorial" }).first().click();

    await expect(page).toHaveURL(/\/memorials\/new/, nav);
    await page.getByLabel("Their full name").fill(fullName);
    await expect(page.locator("#slug")).toHaveValue(slug);
    await page.getByRole("button", { name: "Create memorial" }).click();

    // Lands on the memorial overview.
    await expect(page).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
    const memorialId = new URL(page.url()).pathname.match(/\/memorials\/([0-9a-f-]{36})/)?.[1];
    await expect(page.getByRole("heading", { name: fullName })).toBeVisible(nav);
    await expect(page.getByText("This memorial is a private draft")).toBeVisible(nav);

    // The memorial section nav lives in the sidebar.
    const sideNav = page.getByRole("complementary");

    // Basic information → headline + survived by + gender.
    await sideNav.getByRole("link", { name: "Basic information" }).click();
    await expect(page).toHaveURL(/\/edit$/, nav);
    await page.getByLabel("A short line about them").fill("A gentle soul", nav);
    await page.getByLabel("Survived by").fill("A loving spouse and two children.", nav);
    await page.getByRole("radio", { name: "Male", exact: true }).check(nav);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.", nav);

    // Their story → a published section (required to publish).
    await sideNav.getByRole("link", { name: "Their story" }).click();
    await expect(page).toHaveURL(/\/story$/, nav);
    await page.getByRole("button", { name: "Add a section" }).click();
    await page.getByLabel("Heading").fill("Her life", nav);
    await page.getByLabel("Text").fill("A teacher for forty years.", nav);
    await page.getByLabel("Show this section on the public memorial").check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Published").first()).toBeVisible(nav);

    // Photos → upload one and make it the portrait.
    await sideNav.getByRole("link", { name: "Photos & memories" }).click();
    await expect(page).toHaveURL(/\/photos$/, nav);
    await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/photo.png");
    await expect(page.getByRole("status")).toHaveText(/1 photo added/, nav);
    await page.getByRole("button", { name: "Make portrait" }).click();
    await expect(page.getByText("Portrait", { exact: true })).toBeVisible(nav);
    await page.getByRole("button", { name: "Use as share image" }).click();
    await expect(page.getByText("Share image", { exact: true })).toBeVisible(nav);

    // Customize → visibility.
    await sideNav.getByRole("link", { name: "Privacy & sections" }).click();
    await expect(page).toHaveURL(/\/customize$/, nav);
    await page.getByRole("radio", { name: /Anyone with the link/ }).check(nav);
    await page.getByRole("button", { name: "Save privacy" }).click();
    await expect(page.getByText("Privacy updated.")).toBeVisible(nav);

    // Preview shows the headline and the story section, justified like the
    // public page's own excerpt. No funeral events were added, so the
    // planning-status placeholder appears instead of the section vanishing.
    await sideNav.getByRole("link", { name: "Preview", exact: true }).click();
    await expect(page.getByText("A gentle soul")).toBeVisible(nav);
    await expect(page.getByRole("heading", { name: "Her life" })).toBeVisible(nav);
    await expect(page.getByText("A teacher for forty years.")).toHaveCSS(
      "text-align",
      "justify",
      nav,
    );
    await expect(page.getByRole("heading", { name: "Funeral arrangements" })).toBeVisible(nav);
    await expect(page.getByText(/being planned/i)).toBeVisible(nav);

    // Publish from the overview.
    await sideNav.getByRole("link", { name: "Overview" }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published", { exact: true }).first()).toBeVisible(nav);
    await expect(page.getByText(`evermora.com/${slug}`).first()).toBeVisible(nav);

    // Sign out — from the account menu in the sidebar.
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in/);

    // The public memorial (no auth) now renders the portrait, story and hero.
    // This is the first-ever visit to it, so the "Leave a tribute" prompt would
    // otherwise auto-open and — being a real modal — hide the rest of the page
    // behind aria-hidden; pre-seed a "skip" so this test can see past it.
    if (memorialId) {
      await page.addInitScript((id) => {
        window.localStorage.setItem(
          `evermora.tribute.${id}`,
          JSON.stringify({ skippedAt: Date.now() }),
        );
      }, memorialId);
    }
    await page.goto(`http://localhost:3000/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: fullName })).toBeVisible(nav);
    await expect(page.getByText("A loving spouse and two children.")).toBeVisible(nav);
    await expect(page.getByRole("heading", { name: "Her life" })).toBeVisible(nav);
    await expect(page.locator("main img").first()).toBeVisible(nav);

    // No funeral events were added — the public page shows the same
    // planning-status placeholder as the Preview, not an empty gap.
    await expect(page.getByRole("heading", { name: "Funeral arrangements" })).toBeVisible(nav);
    await expect(page.getByText(/being planned/i)).toBeVisible(nav);

    // Gender: "male" — the inline tribute form's relationship field is
    // phrased with his pronoun, and the "How you knew him" / "Your name"
    // fields line up (no stray "(optional)" description line between them).
    await page.getByRole("heading", { name: "Tributes" }).scrollIntoViewIfNeeded();
    const nameField = page.getByLabel("Your name");
    const relationshipField = page.getByLabel("How you knew him (optional)");
    await expect(relationshipField).toBeVisible(nav);
    const [nameBox, relationshipBox] = await Promise.all([
      nameField.boundingBox(),
      relationshipField.boundingBox(),
    ]);
    expect(Math.abs((nameBox?.y ?? 0) - (relationshipBox?.y ?? NaN))).toBeLessThan(2);

    // The uploaded photo, chosen as the share image, actually gets used for
    // the link-preview card — not the generic brand fallback a memorial with
    // no photos would get. The image route lives on the public web app
    // (port 3000), not this project's own baseURL (family-portal, 3001).
    const [ownRes, fallbackRes] = await Promise.all([
      page.request.get(`http://localhost:3000/${slug}/opengraph-image`),
      page.request.get("http://localhost:3000/no-such-memorial/opengraph-image"),
    ]);
    expect(ownRes.ok()).toBe(true);
    const [ownBody, fallbackBody] = await Promise.all([ownRes.body(), fallbackRes.body()]);
    expect(ownBody.equals(fallbackBody)).toBe(false);
  });
});
