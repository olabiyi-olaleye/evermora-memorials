/**
 * Memorial roles and membership status.
 *
 * Authorization in Evermora is layered (frontend → domain → RLS). These roles
 * are the vocabulary that layer speaks. They are NOT authorization logic — the
 * rules that map a role to what it may do live in `@evermora/domain`.
 */

export const MEMORIAL_ROLES = [
  "owner",
  "admin",
  "content_editor",
  "tribute_moderator",
  "viewer",
] as const;

export type MemorialRole = (typeof MEMORIAL_ROLES)[number];

export const MEMBERSHIP_STATUSES = ["invited", "active", "suspended", "revoked"] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export function isMemorialRole(value: unknown): value is MemorialRole {
  return typeof value === "string" && (MEMORIAL_ROLES as readonly string[]).includes(value);
}

export function isMembershipStatus(value: unknown): value is MembershipStatus {
  return typeof value === "string" && (MEMBERSHIP_STATUSES as readonly string[]).includes(value);
}
