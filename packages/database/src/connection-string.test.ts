import { describe, expect, it } from "vitest";
import { isLocalConnection, redactConnectionString } from "./connection-string";

describe("redactConnectionString", () => {
  it("masks the password but keeps the rest readable", () => {
    const redacted = redactConnectionString(
      "postgresql://postgres:s3cr3t@db.abcxyz.supabase.co:5432/postgres",
    );
    expect(redacted).toContain("postgres:***@");
    expect(redacted).not.toContain("s3cr3t");
    expect(redacted).toContain("db.abcxyz.supabase.co:5432");
  });

  it("fully redacts an unparseable value", () => {
    expect(redactConnectionString("not a url")).toBe("***");
  });
});

describe("isLocalConnection", () => {
  it("recognises localhost and loopback addresses", () => {
    expect(isLocalConnection("postgresql://postgres:pw@localhost:5432/evermora")).toBe(true);
    expect(isLocalConnection("postgresql://postgres:pw@127.0.0.1:5432/evermora")).toBe(true);
  });

  it("treats a hosted database as non-local", () => {
    expect(isLocalConnection("postgresql://postgres:pw@db.abcxyz.supabase.co:5432/postgres")).toBe(
      false,
    );
  });
});
