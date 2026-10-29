import { z } from "zod";
import type { DomainEventName, FuneralEventStatus, MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import {
  ConflictError,
  NotFoundError,
  PreconditionFailedError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";
import { notifyMemorialMembers } from "./notify";

/**
 * publishFuneralEvent / cancelFuneralEvent / completeFuneralEvent — a family
 * member with `funeral.manage` moves a funeral event through its lifecycle.
 * Funeral status is independent of the memorial's lifecycle.
 *
 * - publish:  draft → published            (needs a date; sets published_at)
 * - cancel:   draft | published → cancelled (keeps the record; shows "Cancelled")
 * - complete: published → completed
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  eventId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export type FuneralEventLifecycleInput = z.input<typeof InputSchema>;

export interface FuneralEventLifecycleResult {
  eventId: string;
  status: FuneralEventStatus;
}

const MOVES = {
  publish: { target: "published", from: ["draft", "cancelled"], event: "funeral_event.published" },
  cancel: { target: "cancelled", from: ["draft", "published"], event: "funeral_event.cancelled" },
  complete: { target: "completed", from: ["published"], event: null },
} as const;

async function transition(
  kind: keyof typeof MOVES,
  params: { caller: CallerContext; input: FuneralEventLifecycleInput; deps: OperationDeps },
): Promise<FuneralEventLifecycleResult> {
  const { caller, deps } = params;
  const move = MOVES[kind];

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage funeral information.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "funeral.manage");

    const event = await repos.funeralEvents.findById(parsed.data.eventId);
    if (!event || event.memorialId !== memorialId) {
      throw new NotFoundError("That funeral event does not exist.");
    }
    if (event.status === move.target) {
      return { eventId: event.id, status: event.status };
    }
    if (!(move.from as readonly FuneralEventStatus[]).includes(event.status)) {
      throw new ConflictError(`A ${event.status} event cannot be ${kind}d.`, {
        reason: "invalid_transition",
        from: event.status,
      });
    }
    if (kind === "publish" && !event.eventDate) {
      throw new PreconditionFailedError("Add a date before publishing this event.", {
        reason: "missing_date",
      });
    }

    const now = deps.clock.now().toISOString();
    const updated = await repos.funeralEvents.applyLifecycle(event.id, {
      status: move.target,
      publishedAt:
        kind === "publish"
          ? (event.publishedAt ?? now)
          : kind === "cancel"
            ? event.publishedAt
            : event.publishedAt,
      cancelledAt: kind === "cancel" ? now : event.cancelledAt,
      cancelReason: kind === "cancel" ? (parsed.data.reason ?? null) : event.cancelReason,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: `funeral_event.${move.target}`,
      entityType: "funeral_event",
      entityId: event.id,
      memorialId,
    });
    if (move.event) {
      deps.events.record(move.event as DomainEventName, { memorialId, funeralEventId: event.id });
      await notifyMemorialMembers(repos, deps, caller, {
        memorialId,
        eventType: kind === "publish" ? "funeral_event_published" : "funeral_event_updated",
        payload: { funeralEventId: event.id, title: event.title, kind },
      });
    }

    return { eventId: updated.id, status: updated.status };
  });
}

export function publishFuneralEvent(params: {
  caller: CallerContext;
  input: FuneralEventLifecycleInput;
  deps: OperationDeps;
}): Promise<FuneralEventLifecycleResult> {
  return transition("publish", params);
}
export function cancelFuneralEvent(params: {
  caller: CallerContext;
  input: FuneralEventLifecycleInput;
  deps: OperationDeps;
}): Promise<FuneralEventLifecycleResult> {
  return transition("cancel", params);
}
export function completeFuneralEvent(params: {
  caller: CallerContext;
  input: FuneralEventLifecycleInput;
  deps: OperationDeps;
}): Promise<FuneralEventLifecycleResult> {
  return transition("complete", params);
}
