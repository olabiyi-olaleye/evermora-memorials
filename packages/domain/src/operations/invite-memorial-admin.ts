import { z } from "zod";
import type { MemorialId, MemorialRole } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { ConflictError, UnauthenticatedError, ValidationError } from "../errors";
import type { MembershipDetailRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";
import { notifyByEmail } from "./notify";

/**
 * inviteMemorialAdmin — contract: `docs/domain/operations/invite-memorial-admin.md`.
 *
 * Invite someone to help manage a memorial, in a specific role. The invite is
 * stored by email; the invitee claims it after signing in (see
 * `accept_memorial_invite` RPC / the `/invite/{id}` page). `admins.manage`.
 * `owner` cannot be invited — ownership moves only via `transferMemorialOwnership`.
 */

const INVITE_ROLES = ["admin", "content_editor", "tribute_moderator", "viewer"] as const;

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(200),
  role: z.enum(INVITE_ROLES),
});

export type InviteMemorialAdminInput = z.input<typeof InputSchema>;

export interface InviteMemorialAdminResult {
  membership: MembershipDetailRow;
  reinvited: boolean;
}

export async function inviteMemorialAdmin(params: {
  caller: CallerContext;
  input: InviteMemorialAdminInput;
  deps: OperationDeps;
}): Promise<InviteMemorialAdminResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to invite someone.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The invitation is invalid.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const memorialId = parsed.data.memorialId as MemorialId;
  const { email, role } = parsed.data;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "admins.manage");

    const existing = await repos.memberships.listForMemorial(memorialId);
    const activeSameEmail = existing.find(
      (m) => m.status === "active" && (m.invitedEmail ?? "").toLowerCase() === email,
    );
    if (activeSameEmail) {
      throw new ConflictError("That person is already a member.", { reason: "already_member" });
    }

    const pending = await repos.memberships.pendingInviteFor(memorialId, email);
    if (pending) {
      const membership = await repos.memberships.applyPatch(pending.id, { role });
      await audit(repos, caller, memorialId, membership.id, "memorial_admin.invited", {
        role,
        reinvite: true,
      });
      deps.events.record("memorial_admin.invited", {
        memorialId,
        membershipId: membership.id,
        role,
      });
      return { membership, reinvited: true };
    }

    const membership = await repos.memberships.createInvite({
      id: deps.ids.newId(),
      memorialId,
      profileId: null,
      invitedEmail: email,
      role: role as MemorialRole,
      invitedBy: caller.userId,
    });
    await audit(repos, caller, memorialId, membership.id, "memorial_admin.invited", { role });
    deps.events.record("memorial_admin.invited", { memorialId, membershipId: membership.id, role });
    await notifyByEmail(repos, deps, email, {
      memorialId,
      eventType: "admin_invited",
      payload: { membershipId: membership.id, role },
    });
    return { membership, reinvited: false };
  });
}

async function audit(
  repos: Parameters<typeof requireMemorialPermission>[0],
  caller: CallerContext,
  memorialId: MemorialId,
  entityId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await repos.audit.record({
    actorProfileId: caller.userId,
    actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
    action,
    entityType: "memorial_membership",
    entityId,
    memorialId,
    metadata,
  });
}
