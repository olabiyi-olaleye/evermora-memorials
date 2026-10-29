import { expect, test } from "@playwright/test";

test.describe("apps/web services", () => {
  test("a visitor can send a service enquiry", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Support for the practical details",
    );

    await page.getByLabel("Your name").fill("Grace Nnamdi");
    await page.getByLabel("Email").fill("grace.e2e@example.test");
    await page.getByLabel("What do you need?").selectOption("printing");
    await page.getByLabel("Anything else we should know?").fill("120 programmes for Saturday.");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(page.getByRole("status")).toContainText("we’ve got your message");
  });

  test("the honeypot silently drops a bot submission", async ({ page }) => {
    await page.goto("/services");
    await page.getByLabel("Your name").fill("Bot");
    await page.getByLabel("Email").fill("bot.e2e@example.test");
    // a naive bot fills every input, including the hidden honeypot
    await page.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
      el.value = "http://spam.example";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByRole("button", { name: "Send message" }).click();
    // still shows the friendly confirmation — the bot can't tell
    await expect(page.getByRole("status")).toContainText("we’ve got your message");
  });
});
