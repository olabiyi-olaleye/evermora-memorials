import { expect, test } from "@playwright/test";

/**
 * Family portal — notification centre (Phase 5N). Uses the seeded memorial
 * `josephine-okafor` (owner ada.owner@example.test, content_editor member
 * chidi.editor@example.test). The owner publishes a fresh family update; the
 * member — a different signed-in session — sees the resulting in-app
 * notification and can mark it read.
 */

test("a member is notified when the owner publishes a family update, and can mark it read", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const nav = { timeout: 45_000 };
  const title = `Livestream link is live ${Date.now().toString(36)}`;

  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await owner.goto("/sign-in");
  await owner.getByLabel("Email").fill("ada.owner@example.test");
  await owner.getByLabel("Password").fill("evermora-dev");
  await owner.getByRole("button", { name: "Sign in" }).click();
  await expect(owner).toHaveURL("/", nav);

  await owner.getByRole("main").getByRole("link", { name: "Josephine Adaeze Okafor" }).click();
  await expect(owner).toHaveURL(/\/memorials\/[0-9a-f-]{36}$/, nav);
  await owner.getByRole("link", { name: "Family updates", exact: true }).click();
  await expect(owner).toHaveURL(/\/updates$/, nav);

  await owner.getByRole("button", { name: "Write an update" }).click();
  await owner.getByLabel("Title").fill(title);
  await owner.getByLabel("Update", { exact: true }).fill("Join us online at 3pm.");
  await owner.getByRole("button", { name: "Save draft" }).click();
  const row = owner.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible(nav);
  await row.getByRole("button", { name: "Publish" }).click();
  await expect(row.getByText("Published", { exact: false })).toBeVisible(nav);
  await ownerCtx.close();

  const memberCtx = await browser.newContext();
  const member = await memberCtx.newPage();
  await member.goto("/sign-in");
  await member.getByLabel("Email").fill("chidi.editor@example.test");
  await member.getByLabel("Password").fill("evermora-dev");
  await member.getByRole("button", { name: "Sign in" }).click();
  await expect(member).toHaveURL("/", nav);

  const bell = member.getByRole("button", { name: /Notifications/ });
  await expect(bell).toBeVisible(nav);
  await bell.click();

  const item = member.getByText(`A family update was published: "${title}"`);
  await expect(item).toBeVisible(nav);
  const notifRow = member.getByRole("listitem").filter({ hasText: title });
  await expect(notifRow).toHaveAttribute("data-unread", "true");

  await member.getByRole("button", { name: "Mark all read" }).click();
  // the action awaits the write, then calls router.refresh() — wait for that
  // re-render (the button only shows while unread > 0) instead of a fixed delay
  await expect(member.getByRole("button", { name: "Mark all read" })).toHaveCount(0, nav);
  await member.reload();
  await bell.click();
  await expect(member.getByRole("listitem").filter({ hasText: title })).not.toHaveAttribute(
    "data-unread",
    "true",
  );
  await memberCtx.close();
});
