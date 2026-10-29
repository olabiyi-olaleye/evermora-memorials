import { z } from "zod";
import type { DomainEventName, MemorialId, TributeStatus } from "@evermora/types";
import { roleHasPermission } from "../authorization/permissions";
import { isAuthenticated, type CallerContext } from "../context";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { TributeRow } from "../ports/rows";
import type { OperationDeps } from "./deps";

/**
 * approveTribute / rejectTribute / hideTribute — a family moderator
 * (`tributes.moderate`) sets the moderation state of a tribute. There are no
 * likes, threads or ranking — moderation is the only lever.
 *
 * - approve: pending | reported | hidden → approved (now public)
 * - reject:  pending | reported → rejected (never shown; kept for audit)
 * - hide:    approved | reported → hidden (removed from public, reversible)
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  tributeId: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
});

export type ModerateTributeInput = z.input<typeof InputSchema>;

export interface ModerateTributeResult {
  tributeId: string;
  status: TributeStatus;
}

type Decision = {
  target: TributeStatus;
  from: TributeStatus[];
  action: string;
  event: DomainEventName;
  setsPublished: boolean;
};

const DECISIONS = {
  approve: {
    target: "approved",
    from: ["pending", "reported", "hidden"],
    action: "tribute.approved",
    event: "tribute.approved",
    setsPublished: true,
  },
  reject: {
    target: "rejected",
    from: ["pending", "reported"],
    action: "tribute.rejected",
    event: "tribute.rejected",
    setsPublished: false,
  },
  hide: {
    target: "hidden",
    from: ["approved", "reported"],
    action: "tribute.hidden",
    event: "tribute.hidden",
    setsPublished: false,
  },
} as const satisfies Record<string, Decision>;

async function moderate(
  kind: keyof typeof DECISIONS,
  params: { caller: CallerContext; input: ModerateTributeInput; deps: OperationDeps },
): Promise<ModerateTributeResult> {
  const { caller, deps } = params;
  const decision = DECISIONS[kind];

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to moderate tributes.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) throw new NotFoundError("That memorial does not exist.");

    const role = await repos.memberships.activeRole(memorialId, caller.userId);
    if (!caller.isPlatformAdmin && !roleHasPermission(role, "tributes.moderate")) {
      throw new ForbiddenError("You do not have permission to moderate tributes.");
    }

    const tribute = await repos.tributes.findById(parsed.data.tributeId);
    if (!tribute || tribute.memorialId !== memorialId) {
      throw new NotFoundError("That tribute does not exist.");
    }
    if (tribute.status === decision.target) {
      return { tributeId: tribute.id, status: tribute.status };
    }
    if (!(decision.from as readonly TributeStatus[]).includes(tribute.status)) {
      throw new ConflictError(`A ${tribute.status} tribute cannot be ${kind}d.`, {
        reason: "invalid_transition",
        from: tribute.status,
      });
    }

    const now = deps.clock.now().toISOString();
    const updated = await repos.tributes.moderate(tribute.id, {
      status: decision.target,
      moderatedBy: caller.userId,
      moderatedAt: now,
      publishedAt: decision.setsPublished ? (tribute.publishedAt ?? now) : null,
      moderationNote: parsed.data.note ?? null,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: decision.action,
      entityType: "tribute",
      entityId: tribute.id,
      memorialId,
    });
    deps.events.record(decision.event, { memorialId, tributeId: tribute.id });

    return { tributeId: updated.id, status: updated.status };
  });
}

export function approveTribute(params: {
  caller: CallerContext;
  input: ModerateTributeInput;
  deps: OperationDeps;
}): Promise<ModerateTributeResult> {
  return moderate("approve", params);
}
export function rejectTribute(params: {
  caller: CallerContext;
  input: ModerateTributeInput;
  deps: OperationDeps;
}): Promise<ModerateTributeResult> {
  return moderate("reject", params);
}
export function hideTribute(params: {
  caller: CallerContext;
  input: ModerateTributeInput;
  deps: OperationDeps;
}): Promise<ModerateTributeResult> {
  return moderate("hide", params);
}

export type { TributeRow };
