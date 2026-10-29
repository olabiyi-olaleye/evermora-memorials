import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import {
  ConflictError,
  ForbiddenError,
  MemorialNotFoundError,
  PreconditionFailedError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { OperationDeps } from "./deps";

/**
 * transferMemorialOwnership — contract:
 * `docs/domain/operations/transfer-memorial-ownership.md`.
 *
 * Move the single `owner` role to another **active** member. Only the current
 * owner (or a platform admin) may do this. The previous owner is demoted to
 * `admin` — they never silently lose access. One active owner before and after.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  newOwnerProfileId: z.string().uuid(),
});

export type TransferMemorialOwnershipInput = z.input<typeof InputSchema>;

export interface TransferMemorialOwnershipResult {
  memorialId: string;
  previousOwnerProfileId: string;
  newOwnerProfileId: string;
}

export async function transferMemorialOwnership(params: {
  caller: CallerContext;
  input: TransferMemorialOwnershipInput;
  deps: OperationDeps;
}): Promise<TransferMemorialOwnershipResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to transfer ownership.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;
  const { newOwnerProfileId } = parsed.data;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) throw new MemorialNotFoundError();

    const callerRole = caller.userId
      ? await repos.memberships.activeRole(memorialId, caller.userId)
      : null;
    if (!caller.isPlatformAdmin && callerRole !== "owner") {
      throw new ForbiddenError("Only the current owner can transfer ownership.");
    }

    const members = await repos.memberships.listForMemorial(memorialId);
    const currentOwner = members.find((m) => m.role === "owner" && m.status === "active");
    const target = members.find((m) => m.profileId === newOwnerProfileId && m.status === "active");
    if (!currentOwner || !currentOwner.profileId) {
      throw new PreconditionFailedError("This memorial has no active owner.", {
        reason: "no_owner",
      });
    }
    if (!target) {
      throw new PreconditionFailedError("Invite that person as a member first.", {
        reason: "target_not_member",
      });
    }
    if (target.profileId === currentOwner.profileId) {
      throw new ConflictError("That person is already the owner.", { reason: "same_owner" });
    }

    const { previousOwnerProfileId } = await repos.memberships.transferOwnership(
      memorialId,
      newOwnerProfileId,
    );

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.ownership_transferred",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { from: previousOwnerProfileId, to: newOwnerProfileId },
    });
    deps.events.record("memorial.ownership_transferred", {
      memorialId,
      from: previousOwnerProfileId,
      to: newOwnerProfileId,
    });

    return { memorialId, previousOwnerProfileId, newOwnerProfileId };
  });
}
