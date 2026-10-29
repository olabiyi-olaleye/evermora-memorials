import type { MemorialId } from "@evermora/types";
import { roleHasPermission, type MemorialPermission } from "../authorization/permissions";
import type { CallerContext } from "../context";
import { ForbiddenError, MemorialInvalidStateError, MemorialNotFoundError } from "../errors";
import type { Repositories } from "../ports/repositories";
import type { MemorialRow } from "../ports/rows";

/**
 * Shared precondition for every memorial-scoped write: the memorial must exist
 * and be visible to the caller (RLS-scoped `findById`), the caller must hold
 * `permission` (or be a platform admin), and the memorial must not be
 * suspended (or, unless `allowArchived`, archived).
 *
 * Returns the loaded memorial so the operation doesn't re-read it.
 */
export async function requireMemorialPermission(
  repos: Repositories,
  caller: CallerContext,
  memorialId: MemorialId,
  permission: MemorialPermission,
  opts: { allowArchived?: boolean } = {},
): Promise<MemorialRow> {
  const memorial = await repos.memorials.findById(memorialId);
  if (!memorial || memorial.deletedAt) throw new MemorialNotFoundError();

  const role = await repos.memberships.activeRole(memorialId, caller.userId!);
  if (!caller.isPlatformAdmin && !roleHasPermission(role, permission)) {
    throw new ForbiddenError("You do not have permission to change this memorial.");
  }

  if (memorial.status === "suspended") {
    throw new MemorialInvalidStateError(
      "suspended",
      "This memorial has been suspended by Evermora.",
    );
  }
  if (memorial.status === "archived" && !opts.allowArchived) {
    throw new MemorialInvalidStateError("archived", "Restore the memorial before editing it.");
  }

  return memorial;
}
