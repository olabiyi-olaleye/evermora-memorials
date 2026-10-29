import { describe, expect, it } from "vitest";
import {
  anonymousContext,
  DomainError,
  DomainEventBuffer,
  ForbiddenError,
  isAuthenticated,
  isDomainError,
} from "./index";

describe("domain errors", () => {
  it("tags subclasses with a stable code", () => {
    expect(new ForbiddenError().code).toBe("forbidden");
  });

  it("isDomainError recognises the hierarchy but not plain errors", () => {
    expect(isDomainError(new ForbiddenError())).toBe(true);
    expect(isDomainError(new DomainError({ code: "internal", message: "x" }))).toBe(true);
    expect(isDomainError(new Error("nope"))).toBe(false);
  });
});

describe("caller context", () => {
  it("anonymous context is unauthenticated with no roles", () => {
    const ctx = anonymousContext();
    expect(isAuthenticated(ctx)).toBe(false);
    expect(ctx.memorialRoles.size).toBe(0);
  });
});

describe("DomainEventBuffer", () => {
  it("records and drains events once", () => {
    const buffer = new DomainEventBuffer();
    buffer.record("memorial.created", { memorialId: "m_1" });
    expect(buffer.size).toBe(1);

    const drained = buffer.drain();
    expect(drained).toHaveLength(1);
    expect(drained[0]?.name).toBe("memorial.created");
    expect(buffer.size).toBe(0);
  });
});
