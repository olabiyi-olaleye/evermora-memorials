import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createEnv, EnvValidationError } from "./index";

describe("createEnv", () => {
  const baseOptions = {
    server: { DATABASE_URL: z.string().min(1) },
    client: { NEXT_PUBLIC_APP_URL: z.string().url() },
  };

  it("parses a valid environment into a typed, frozen object", () => {
    const env = createEnv({
      ...baseOptions,
      runtimeEnv: {
        DATABASE_URL: "postgresql://localhost:5432/evermora",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      },
    });

    expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/evermora");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("throws EnvValidationError listing every problem", () => {
    try {
      createEnv({
        ...baseOptions,
        runtimeEnv: { NEXT_PUBLIC_APP_URL: "not-a-url" },
      });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const issues = (error as EnvValidationError).issues;
      expect(issues.some((i) => i.includes("DATABASE_URL"))).toBe(true);
      expect(issues.some((i) => i.includes("NEXT_PUBLIC_APP_URL"))).toBe(true);
    }
  });

  it("treats empty strings as unset", () => {
    expect(() =>
      createEnv({
        ...baseOptions,
        runtimeEnv: { DATABASE_URL: "", NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
      }),
    ).toThrow(EnvValidationError);
  });

  it("rejects a client key without the public prefix", () => {
    expect(() =>
      createEnv({
        server: {},
        client: { SECRET_KEY: z.string() },
        runtimeEnv: {},
      }),
    ).toThrow(/must start with "NEXT_PUBLIC_"/);
  });

  it("rejects a server key that uses the public prefix", () => {
    expect(() =>
      createEnv({
        server: { NEXT_PUBLIC_LEAK: z.string() },
        client: {},
        runtimeEnv: {},
      }),
    ).toThrow(/must not start with "NEXT_PUBLIC_"/);
  });
});
