import { z } from "zod";
import type { DomainEventName, MemorialId, PublicationStatus } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { ConflictError, NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";
import { notifyMemorialMembers } from "./notify";

/**
 * publishFamilyUpdate / archiveFamilyUpdate — move one family update through its
 * lifecycle (`draft → published → archived`, and `archived → published` again).
 * `updates.publish`.
 *
 * - publish:  draft | archived → published   (sets published_at once)
 * - archive:  published → archived            (taken down; kept for history)
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  updateId: z.string().uuid(),
});

export type FamilyUpdateLifecycleInput = z.input<typeof InputSchema>;

export interface FamilyUpdateLifecycleResult {
  updateId: string;
  status: PublicationStatus;
}

const MOVES = {
  publish: {
    target: "published",
    from: ["draft", "archived"],
    event: "family_update.published" as const,
  },
  archive: { target: "archived", from: ["published"], event: null },
} as const;

async function transition(
  kind: keyof typeof MOVES,
  params: { caller: CallerContext; input: FamilyUpdateLifecycleInput; deps: OperationDeps },
): Promise<FamilyUpdateLifecycleResult> {
  const { caller, deps } = params;
  const move = MOVES[kind];

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage family updates.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "updates.publish");

    const update = await repos.familyUpdates.findById(parsed.data.updateId);
    if (!update || update.memorialId !== memorialId) {
      throw new NotFoundError("That family update does not exist.");
    }
    if (update.status === move.target) {
      return { updateId: update.id, status: update.status };
    }
    if (!(move.from as readonly PublicationStatus[]).includes(update.status)) {
      throw new ConflictError(`A ${update.status} update cannot be ${kind}d.`, {
        reason: "invalid_transition",
        from: update.status,
      });
    }

    const now = deps.clock.now().toISOString();
    const updated = await repos.familyUpdates.applyLifecycle(update.id, {
      status: move.target,
      publishedAt: kind === "publish" ? (update.publishedAt ?? now) : update.publishedAt,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: `family_update.${move.target}`,
      entityType: "family_update",
      entityId: update.id,
      memorialId,
    });
    if (move.event) {
      deps.events.record(move.event as DomainEventName, {
        memorialId,
        familyUpdateId: update.id,
        importance: updated.importance,
      });
      await notifyMemorialMembers(repos, deps, caller, {
        memorialId,
        eventType: "family_update_published",
        payload: {
          familyUpdateId: update.id,
          title: updated.title,
          importance: updated.importance,
        },
      });
    }

    return { updateId: updated.id, status: updated.status };
  });
}

export function publishFamilyUpdate(params: {
  caller: CallerContext;
  input: FamilyUpdateLifecycleInput;
  deps: OperationDeps;
}): Promise<FamilyUpdateLifecycleResult> {
  return transition("publish", params);
}
export function archiveFamilyUpdate(params: {
  caller: CallerContext;
  input: FamilyUpdateLifecycleInput;
  deps: OperationDeps;
}): Promise<FamilyUpdateLifecycleResult> {
  return transition("archive", params);
}
