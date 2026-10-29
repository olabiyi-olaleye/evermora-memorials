// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createWebEnv } from "./env";

describe("apps/web env", () => {
  it("parses a complete, valid environment", () => {
    const env = createWebEnv({
      APP_ENV: "development",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54422/postgres",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_FAMILY_URL: "http://localhost:3001",
      NEXT_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(env.NEXT_PUBLIC_FAMILY_URL).toBe("http://localhost:3001");
  });

  it("throws when a required variable is missing", () => {
    expect(() => createWebEnv({})).toThrow();
  });
});
