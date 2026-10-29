// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createFamilyPortalEnv } from "./env";

describe("apps/family-portal env", () => {
  it("parses a complete, valid environment", () => {
    const env = createFamilyPortalEnv({
      APP_ENV: "development",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54422/postgres",
      NEXT_PUBLIC_FAMILY_URL: "http://localhost:3001",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(env.NEXT_PUBLIC_FAMILY_URL).toBe("http://localhost:3001");
  });

  it("throws when the service role key is missing", () => {
    expect(() =>
      createFamilyPortalEnv({
        DATABASE_URL: "postgresql://x",
        NEXT_PUBLIC_FAMILY_URL: "http://localhost:3001",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toThrow();
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() =>
      createFamilyPortalEnv({
        APP_ENV: "development",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        NEXT_PUBLIC_FAMILY_URL: "http://localhost:3001",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toThrow();
  });
});
