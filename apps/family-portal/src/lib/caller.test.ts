// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ForbiddenError, SlugReservedError } from "@evermora/domain";
import { safeNext, toActionError, toCallerContext } from "./caller";

describe("safeNext", () => {
  it("keeps a same-origin relative path", () => {
    expect(safeNext("/memorials/abc/settings")).toBe("/memorials/abc/settings");
  });

  it("rejects anything that could leave the origin", () => {
    for (const bad of [
      "//evil.example",
      "https://evil.example",
      "http://evil.example",
      "/\\evil.example",
      "evil",
      "",
      null,
      undefined,
    ]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

describe("toCallerContext", () => {
  it("derives identity only from the verified user", () => {
    const ctx = toCallerContext({
      id: "11111111-1111-4111-8111-111111111111",
      email: "a@b.test",
      displayName: "Ada",
      isPlatformAdmin: true,
    });
    expect(ctx.userId).toBe("11111111-1111-4111-8111-111111111111");
    expect(ctx.isPlatformAdmin).toBe(true);
    expect(ctx.memorialRoles.size).toBe(0);
  });

  it("does not accept a client-supplied role/id — there is no channel for it", () => {
    // toCallerContext's only input is AuthUser; there is no `role` / spoof field.
    const ctx = toCallerContext({
      id: "00000000-0000-4000-8000-000000000000",
      email: null,
      displayName: null,
      isPlatformAdmin: false,
    });
    expect(ctx.isPlatformAdmin).toBe(false);
    expect(ctx.memorialRoles.size).toBe(0);
  });
});

describe("toActionError", () => {
  it("passes a domain error's code + message through", () => {
    expect(toActionError(new ForbiddenError("nope"))).toMatchObject({
      code: "forbidden",
      message: "nope",
    });
    expect(toActionError(new SlugReservedError("admin"))).toMatchObject({
      code: "validation",
      details: { reason: "slug_reserved" },
    });
  });

  it("never leaks a raw error to the caller", () => {
    const leaky = new Error("PostgresError: relation memorials does not exist at db.js:42");
    const mapped = toActionError(leaky);
    expect(mapped.code).toBe("internal");
    expect(mapped.message).not.toMatch(/Postgres|db\.js|memorials/);
  });
});
