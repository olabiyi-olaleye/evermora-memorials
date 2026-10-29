import { defineConfig, devices } from "@playwright/test";

/**
 * Root Playwright foundation.
 *
 * `web` smoke-checks the public marketing site. `family` drives the
 * authenticated family portal, and `admin` the platform-admin console,
 * against the local Supabase stack (seeded users, offset ports) — run
 * `supabase start` first.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "web",
      testDir: "./e2e/web",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "family",
      testDir: "./e2e/family",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
    },
    {
      name: "admin",
      testDir: "./e2e/admin",
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3002" },
    },
  ],
  // Production `build && start` — deterministic (Turbopack dev's route cache
  // gets confused when a prior `next build` left production artifacts in
  // `.next`) and it exercises the real bundle. Needs `apps/*/.env.local` with
  // the local Supabase values, and `supabase start` running.
  webServer: [
    {
      command: "npm run build --workspace=@evermora/web && npm run start --workspace=@evermora/web",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: process.env.CI ? 420_000 : 240_000,
    },
    {
      command:
        "npm run build --workspace=@evermora/family-portal && npm run start --workspace=@evermora/family-portal",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: process.env.CI ? 420_000 : 240_000,
    },
    {
      command:
        "npm run build --workspace=@evermora/platform-admin && npm run start --workspace=@evermora/platform-admin",
      url: "http://localhost:3002",
      reuseExistingServer: !process.env.CI,
      timeout: process.env.CI ? 420_000 : 240_000,
    },
  ],
});
