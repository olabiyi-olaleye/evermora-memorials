import type { MemorialRole } from "@evermora/types";

/**
 * The Evermora permission model — the domain half of the three-layer model
 * (UI → **domain** → RLS). This mapping MUST stay identical to the SQL function
 * `app.has_memorial_permission` (see
 * `supabase/migrations/*_authorization_functions.sql` and
 * `docs/product/permission-matrix.md`). RLS re-checks it underneath, so a drift
 * here fails safe (the DB rejects the write) — but it should never drift.
 */

export type MemorialPermission =
  | "memorial.edit"
  | "story.edit"
  | "gallery.manage"
  | "funeral.manage"
  | "updates.publish"
  | "tributes.moderate"
  | "admins.manage"
  | "privacy.manage"
  | "billing.manage"
  | "memorial.delete";

const MATRIX: Record<MemorialRole, ReadonlySet<MemorialPermission>> = {
  owner: new Set<MemorialPermission>([
    "memorial.edit",
    "story.edit",
    "gallery.manage",
    "funeral.manage",
    "updates.publish",
    "tributes.moderate",
    "admins.manage",
    "privacy.manage",
    "billing.manage",
    "memorial.delete",
  ]),
  admin: new Set<MemorialPermission>([
    "memorial.edit",
    "story.edit",
    "gallery.manage",
    "funeral.manage",
    "updates.publish",
    "tributes.moderate",
    "admins.manage",
    "privacy.manage",
  ]),
  content_editor: new Set<MemorialPermission>([
    "memorial.edit",
    "story.edit",
    "gallery.manage",
    "funeral.manage",
    "updates.publish",
  ]),
  tribute_moderator: new Set<MemorialPermission>(["tributes.moderate"]),
  viewer: new Set<MemorialPermission>(),
};

/**
 * Does `role` grant `permission`? `null` role (no active membership) grants
 * nothing. Platform-admin authority is a *separate, explicit* path and is
 * deliberately NOT folded in here (mirrors the SQL).
 */
export function roleHasPermission(
  role: MemorialRole | null,
  permission: MemorialPermission,
): boolean {
  if (role === null) return false;
  return MATRIX[role].has(permission);
}
