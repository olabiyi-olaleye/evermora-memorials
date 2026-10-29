// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createPlatformAdminEnv } from "./env";

describe("apps/platform-admin env", () => {
  it("parses a complete, valid environment", () => {
    const env = createPlatformAdminEnv({
      APP_ENV: "development",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NEXT_PUBLIC_ADMIN_URL: "http://localhost:3002",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54422/postgres",
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(env.NEXT_PUBLIC_ADMIN_URL).toBe("http://localhost:3002");
  });

  it("throws when a required variable is missing", () => {
    expect(() => createPlatformAdminEnv({})).toThrow();
  });
});
