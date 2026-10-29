import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PreconditionFailedError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { MembershipDetailRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * changeMemorialRole — contract: `docs/domain/operations/change-memorial-role.md`.
 *
 * Change an existing member's role, or suspend / restore / revoke their access.
 * `admins.manage`. Never creates a second owner, never removes the last owner,
 * and a caller cannot change their own role.
 */

const ROLES = ["admin", "content_editor", "tribute_moderator", "viewer"] as const;
const STATUSES = ["active", "suspended", "revoked"] as const;

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    membershipId: z.string().min(1),
    role: z.enum(ROLES).optional(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((v) => v.role !== undefined || v.status !== undefined, {
    message: "Provide a new role or status.",
  });

export type ChangeMemorialRoleInput = z.input<typeof InputSchema>;

export async function changeMemorialRole(params: {
  caller: CallerContext;
  input: ChangeMemorialRoleInput;
  deps: OperationDeps;
}): Promise<{ membership: MembershipDetailRow }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to change access.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;
  const { membershipId, role, status } = parsed.data;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "admins.manage");

    const membership = await repos.memberships.detailById(membershipId);
    if (!membership || membership.memorialId !== memorialId) {
      throw new NotFoundError("That team member was not found.");
    }
    if (membership.role === "owner") {
      throw new ConflictError("Change the owner by transferring ownership instead.", {
        reason: "is_owner",
      });
    }
    if (membership.profileId && membership.profileId === caller.userId) {
      throw new ForbiddenError("You cannot change your own access.");
    }
    if (membership.status === "revoked") {
      throw new ConflictError("That access was revoked; send a fresh invitation.", {
        reason: "revoked",
      });
    }

    const from = { role: membership.role, status: membership.status };
    const patch: {
      role?: (typeof ROLES)[number];
      status?: (typeof STATUSES)[number];
      revokedAt?: string | null;
    } = {};
    if (role && role !== membership.role) patch.role = role;
    if (status && status !== membership.status) {
      patch.status = status;
      patch.revokedAt = status === "revoked" ? deps.clock.now().toISOString() : null;
    }
    if (Object.keys(patch).length === 0) {
      throw new ConflictError("That is already the current role and status.", {
        reason: "no_change",
      });
    }

    let updated: MembershipDetailRow;
    try {
      updated = await repos.memberships.applyPatch(membershipId, patch);
    } catch (err) {
      // last-owner / self-escalation guards surface as insufficient_privilege (42501)
      if (
        err instanceof Error &&
        /insufficient_privilege|only active owner|your own role/i.test(err.message)
      ) {
        throw new PreconditionFailedError("That change isn't allowed by the ownership rules.", {
          reason: "ownership_guard",
        });
      }
      throw err;
    }

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial_role.changed",
      entityType: "memorial_membership",
      entityId: membershipId,
      memorialId,
      metadata: { from, to: { role: updated.role, status: updated.status } },
    });
    deps.events.record("memorial_role.changed", {
      memorialId,
      membershipId,
      from: from.role,
      to: updated.role,
    });
    return { membership: updated };
  });
}
