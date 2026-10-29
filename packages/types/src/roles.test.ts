import { describe, expect, it } from "vitest";
import { isMemorialRole, isMembershipStatus, MEMORIAL_ROLES } from "./roles";

describe("role guards", () => {
  it("accepts every declared memorial role", () => {
    for (const role of MEMORIAL_ROLES) {
      expect(isMemorialRole(role)).toBe(true);
    }
  });

  it("rejects unknown or malformed roles", () => {
    expect(isMemorialRole("superuser")).toBe(false);
    expect(isMemorialRole(42)).toBe(false);
    expect(isMemorialRole(undefined)).toBe(false);
  });

  it("validates membership status", () => {
    expect(isMembershipStatus("active")).toBe(true);
    expect(isMembershipStatus("deleted")).toBe(false);
  });
});
