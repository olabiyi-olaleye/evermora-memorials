import { expect, test } from "@playwright/test";

/**
 * Public memorial route — resolution, alias redirect, privacy, 404.
 * Runs against the local Supabase stack (`supabase start`) with the seed:
 *   josephine-okafor  → published, public
 *   mama-josephine    → retired alias of josephine-okafor (redirect on)
 *   emeka-balogun     → draft + private
 */

const JOSEPHINE_ID = "e1000000-0000-4000-a000-000000000001";

/**
 * The tribute prompt auto-opens on a fresh browser and, while open, puts the
 * rest of the page behind `aria-hidden` (a real modal, not a decoration) —
 * so any test that isn't specifically about the prompt itself needs it out
 * of the way first. Pre-seeding localStorage (as a recent "skip") is exactly
 * what a returning visitor's browser looks like, and is far less brittle
 * than dismissing a dialog in every unrelated test.
 */
async function suppressTributePrompt(
  page: import("@playwright/test").Page,
  memorialId = JOSEPHINE_ID,
) {
  await page.addInitScript((id) => {
    window.localStorage.setItem(
      `evermora.tribute.${id}`,
      JSON.stringify({ skippedAt: Date.now() }),
    );
  }, memorialId);
}

test.describe("public memorial", () => {
  test("renders a published public memorial", async ({ page }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");
    await expect(page).toHaveTitle(/Josephine Adaeze Okafor/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Josephine Adaeze Okafor");
    await expect(page.getByText("1945 – 2026")).toBeVisible();
    await expect(page.getByText("Teacher, matriarch, and lover of hymns.")).toBeVisible();
  });

  test("has a real link-preview image, and a private memorial's never reveals who it is", async ({
    page,
    request,
  }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");

    const ogImage = page.locator('meta[property="og:image"]');
    const ogImageUrl = await ogImage.getAttribute("content");
    expect(ogImageUrl).toContain("/josephine-okafor/opengraph-image");
    // Versioned by what's drawn into the image, so a new cover/name busts
    // WhatsApp & co.'s cache — and the Twitter card carries the same version.
    const version = new URL(ogImageUrl!).searchParams.get("v");
    expect(version).toMatch(/^[0-9a-f]{12}$/);
    const twitterImageUrl = await page
      .locator('meta[name="twitter:image"]')
      .getAttribute("content");
    expect(twitterImageUrl).toContain(`/josephine-okafor/twitter-image?v=${version}`);

    const res = await request.get(ogImageUrl!);
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/png");

    // A private memorial's share image never reveals the name — same
    // generic fallback as an unknown slug, even though a crawler could
    // reach this route directly without ever loading the (404ing) page.
    const [privateRes, unknownRes] = await Promise.all([
      request.get("/emeka-balogun/opengraph-image"),
      request.get("/no-such-memorial/opengraph-image"),
    ]);
    expect(privateRes.ok()).toBe(true);
    expect(unknownRes.ok()).toBe(true);
    const [privateBody, unknownBody] = await Promise.all([privateRes.body(), unknownRes.body()]);
    expect(privateBody.equals(unknownBody)).toBe(true);
  });

  test("renders published story sections and the timeline, not drafts", async ({ page }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");
    await expect(page.getByRole("heading", { name: "Her life" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "A life in moments" })).toBeVisible();
    await expect(page.getByText("Qualified as a teacher")).toBeVisible();
    // Draft story section + draft milestone are not shown.
    const html = await page.content();
    expect(html).not.toContain("scholarships in her name");
    expect(html).not.toContain("Passed away in Enugu");
  });

  test("hero shows Survived by, and the page runs Their Story (excerpt + Read more) ahead of everything else", async ({
    page,
  }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");

    // "Survived by" sits in the hero, right under the headline.
    await expect(
      page.getByText("Her husband Michael, five children, and eleven grandchildren."),
    ).toBeVisible();

    // Their Story previews only the first published section...
    await expect(page.getByRole("heading", { name: "Her life" })).toBeVisible();
    // ...the second published section is held back for the full story page.
    const html = await page.content();
    expect(html).not.toContain("led the church choir for twenty years");

    const readMore = page.getByRole("link", { name: "Read more" });
    await expect(readMore).toBeVisible();

    // The excerpt reads as justified body text, like a printed page.
    await expect(page.getByText("Born in Enugu in 1945")).toHaveCSS("text-align", "justify");

    // Page order: hero (Survived by) → Their Story → family updates → funeral → timeline → tributes.
    const order = [
      "Her husband Michael, five children, and eleven grandchildren.",
      "Her life",
      "Thank you from the family",
      "Funeral arrangements",
      "A life in moments",
      "Tributes",
    ].map((needle) => html.indexOf(needle));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));

    // "Read more" leads to the full story, with every published section.
    await readMore.click();
    await expect(page).toHaveURL(/\/josephine-okafor\/story$/);
    await expect(page.getByRole("heading", { name: "Her life" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Faith and music" })).toBeVisible();
    await expect(page.getByText("led the church choir for twenty years")).toBeVisible();
    // Justified here too — the full story reads the same way as the excerpt.
    await expect(page.getByText("led the church choir for twenty years")).toHaveCSS(
      "text-align",
      "justify",
    );
    // Still no draft content.
    expect(await page.content()).not.toContain("scholarships in her name");

    await page.getByRole("link", { name: /Back to .*memorial/ }).click();
    await expect(page).toHaveURL(/\/josephine-okafor$/);
  });

  test("previews the most recent tributes, justified, and links to the full list for the rest", async ({
    page,
  }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");
    await page.getByRole("heading", { name: "Tributes" }).scrollIntoViewIfNeeded();

    // Seed has 6 approved tributes; only the 5 most recent show inline —
    // "A Wellwisher From The Village" (the oldest) is held back for the
    // full page, while the 5th-newest (Tunde Bakare) still makes the cut.
    await expect(page.getByText("Mrs. Okafor taught me to read")).toBeVisible();
    await expect(page.getByText("her patience with a slow learner")).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("Her legacy lives on in all of us");

    // Reads as justified body text, like Their Story.
    await expect(page.getByText("Mrs. Okafor taught me to read")).toHaveCSS(
      "text-align",
      "justify",
    );

    const viewAll = page.getByRole("link", { name: "View all tributes" });
    await expect(viewAll).toBeVisible();
    await viewAll.click();
    await expect(page).toHaveURL(/\/josephine-okafor\/tributes$/);

    // The full page has every approved tribute, including the one held back.
    await expect(page.getByText("Mrs. Okafor taught me to read")).toBeVisible();
    await expect(page.getByText("Her legacy lives on in all of us")).toBeVisible();
    await expect(page.getByText("Her legacy lives on in all of us")).toHaveCSS(
      "text-align",
      "justify",
    );
    // Never a pending or rejected one.
    expect(await page.content()).not.toContain("plate of food for anyone who passed");
    expect(await page.content()).not.toContain("BUY CHEAP WATCHES");

    await page.getByRole("link", { name: /Back to .*memorial/ }).click();
    await expect(page).toHaveURL(/\/josephine-okafor$/);
  });

  // Serial: each of these submits a real tribute to the same memorial, and
  // submission is IP-rate-limited (3 per 10 minutes) — run in parallel with
  // each other (or with a manual run against the same local stack) they can
  // trip that limit purely from test traffic, not a real bug.
  test.describe.serial("tribute prompt", () => {
    test("shows approved tributes; the auto-open prompt accepts a new one (moderated → pending)", async ({
      page,
    }) => {
      await page.goto("/josephine-okafor");

      // The prompt opens on its own — the first meaningful action available.
      const dialog = page.getByRole("dialog", {
        name: "In loving memory of Josephine Adaeze Okafor",
      });
      await expect(dialog).toBeVisible();

      // Josephine is seeded with gender: "female" — the relationship field
      // is phrased with her pronoun, not the generic "them".
      await expect(dialog.getByLabel("How you knew her (optional)")).toBeVisible();

      // A submission on a moderated memorial does not appear immediately.
      const unique = `A private memory ${Date.now().toString(36)}`;
      await dialog.getByLabel("Your name").fill("A Visitor From The Test");
      await dialog.getByLabel("Your message").fill(unique);
      await dialog.getByRole("button", { name: "Post tribute" }).click();
      await expect(dialog.getByRole("status")).toContainText("sent to the family");
      // The thank-you message stays put until the visitor is done reading it.
      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(dialog).toBeHidden();

      // Existing tributes and the form are still there, below the prompt —
      // and the visitor's own (still pending) tribute is now shown back to
      // them, tagged "You" and "Awaiting review", among the others. No other
      // visitor gets this: it comes from their private edit token, not the
      // public (approved-only) list.
      await expect(page.getByRole("heading", { name: "Tributes" })).toBeVisible();
      await expect(page.getByText("Mrs. Okafor taught me to read")).toBeVisible();
      const ownTributeItem = page.locator("li", { hasText: unique });
      await expect(ownTributeItem.getByText("You", { exact: true })).toBeVisible();
      await expect(ownTributeItem.getByText("Awaiting review")).toBeVisible();

      await page.reload();
      // Still visible to this visitor after reload, from localStorage.
      await expect(page.getByText(unique)).toBeVisible();
      // Having submitted, the prompt does not come back on this browser.
      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test("skipping the prompt still leaves the inline tributes form usable", async ({ page }) => {
      await page.goto("/josephine-okafor");
      const dialog = page.getByRole("dialog", {
        name: "In loving memory of Josephine Adaeze Okafor",
      });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Skip for now" }).click();
      await expect(dialog).toBeHidden();

      // The persistent section, further down the page, is untouched by the skip.
      await page.getByRole("heading", { name: "Tributes" }).scrollIntoViewIfNeeded();
      const unique = `Skipped then wrote anyway ${Date.now().toString(36)}`;
      await page.getByLabel("Your name").fill("Came Back Later");
      await page.getByLabel("Your message").fill(unique);
      await page.getByRole("button", { name: "Post tribute" }).click();
      await expect(page.getByRole("status")).toContainText("sent to the family");
    });

    test("a submitter can edit their own tribute afterwards", async ({ page }) => {
      await page.goto("/josephine-okafor");
      const dialog = page.getByRole("dialog", {
        name: "In loving memory of Josephine Adaeze Okafor",
      });
      const original = `Original words ${Date.now().toString(36)}`;
      await dialog.getByLabel("Your name").fill("Edits Their Tribute");
      await dialog.getByLabel("Your message").fill(original);
      await dialog.getByRole("button", { name: "Post tribute" }).click();
      await expect(dialog.getByRole("status")).toContainText("sent to the family");
      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(dialog).toBeHidden();

      await page.reload();
      await page.getByRole("heading", { name: "Tributes" }).scrollIntoViewIfNeeded();
      await expect(page.getByText("You’ve already left a tribute here.")).toBeVisible();
      await page.getByRole("button", { name: "Edit your tribute" }).click();

      const nameField = page.getByLabel("Your name");
      await expect(nameField).toHaveValue("Edits Their Tribute");
      const edited = `Edited words ${Date.now().toString(36)}`;
      await page.getByLabel("Your message").fill(edited);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByRole("status")).toContainText("sent to the family for another look");
    });
  });

  test("shows published funeral events, hides members-only events and drafts", async ({ page }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");
    await expect(page.getByRole("heading", { name: "Funeral arrangements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Service of Songs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Funeral Service" })).toBeVisible();
    const html = await page.content();
    // members-only event and the draft reception are not exposed to visitors.
    expect(html).not.toContain("Family Wake-Keeping");
    expect(html).not.toContain("Okafor family home");

    // The funeral service has a venue pin: Map goes to the exact spot and
    // there are directions. The service of songs has only an address, so
    // Map is a text search and there are no directions to guess at.
    const event = (name: string) =>
      page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
    const pinned = event("Funeral Service");
    await expect(pinned.getByRole("link", { name: "Map" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=6.4402%2C7.4943",
    );
    await expect(pinned.getByRole("link", { name: "Directions" })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=6.4402,7.4943",
    );
    const addressOnly = event("Service of Songs");
    await expect(addressOnly.getByRole("link", { name: "Map" })).toHaveAttribute(
      "href",
      /query=St\.%20Monica/,
    );
    await expect(addressOnly.getByRole("link", { name: "Directions" })).toHaveCount(0);
  });

  test("lists RSVP contacts once, under all the funeral events", async ({ page }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Funeral arrangements" }),
    });
    await expect(section.getByRole("heading", { name: "RSVP" })).toBeVisible();

    // Not repeated inside each event card.
    const funeralService = section
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "Funeral Service", exact: true }) });
    await expect(funeralService.getByText("Chidi Okafor")).toHaveCount(0);

    // Shared across two events (formatted differently) → listed once.
    await expect(section.getByText("Chidi Okafor", { exact: true })).toHaveCount(1);
    await expect(section.getByText("Ngozi Eze", { exact: true })).toHaveCount(1);
    await expect(section.getByText("Emeka Okafor", { exact: true })).toHaveCount(1);
    await expect(section.getByRole("link", { name: "0803 123 4567" })).toHaveAttribute(
      "href",
      "tel:08031234567",
    );
  });

  test("shows published family updates, hides members-only updates and drafts", async ({
    page,
  }) => {
    await suppressTributePrompt(page);
    await page.goto("/josephine-okafor");
    await expect(page.getByRole("heading", { name: "From the family", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thank you from the family" })).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("Family logistics for the wake");
    expect(html).not.toContain("Draft: order of service");
  });

  test("does not leak the members-only resting place", async ({ page }) => {
    await page.goto("/josephine-okafor");
    await expect(page.getByText("Enugu Municipal Cemetery")).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain("Enugu Municipal Cemetery");
  });

  test("a scanned QR token redirects to the canonical memorial", async ({ page }) => {
    // seed: token a1b2c3d4e5f6 → josephine-okafor, active
    await suppressTributePrompt(page);
    await page.goto("/q/a1b2c3d4e5f6");
    await expect(page).toHaveURL(/\/josephine-okafor$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Josephine Adaeze Okafor");
  });

  test("a retired QR token shows a gentle notice, not a broken link", async ({ page }) => {
    // seed: token 999888777666 → josephine-okafor, retired
    await page.goto("/q/999888777666");
    await expect(page).toHaveURL(/\/q\/999888777666$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("isn’t available here");
  });

  test("an unknown QR token is a respectful 404", async ({ page }) => {
    const res = await page.goto("/q/ffffffffffff");
    expect(res?.status()).toBe(404);
  });

  test("redirects a historical alias to the canonical address", async ({ page }) => {
    await suppressTributePrompt(page);
    await page.goto("/mama-josephine");
    await expect(page).toHaveURL(/\/josephine-okafor$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Josephine Adaeze Okafor");
  });

  test("a private draft memorial 404s without confirming it exists", async ({ page }) => {
    const res = await page.goto("/emeka-balogun");
    expect(res?.status()).toBe(404);
    const html = await page.content();
    expect(html).not.toContain("Emeka Daniel Balogun");
    expect(html).not.toContain("Engineer and mentor");
  });

  test("a reserved route with no page is never a memorial", async ({ page }) => {
    const res = await page.goto("/pricing");
    expect(res?.status()).toBe(404);
  });

  test("a marketing route wins over the memorial resolver", async ({ page }) => {
    const res = await page.goto("/about");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "A permanent home for a life and a legacy",
    );
  });

  test("an unknown slug gets a respectful 404", async ({ page }) => {
    const res = await page.goto("/no-such-person-here");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("could not be found");
  });
});
