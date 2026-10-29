import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * reorderMilestones — set an explicit display order for a memorial's
 * milestones. `orderedIds` must be exactly the memorial's current milestone
 * ids. `story.edit`. (The public timeline still sorts by year first; this
 * order only breaks ties within a year.)
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1).max(200),
});

export type ReorderMilestonesInput = z.input<typeof InputSchema>;

export async function reorderMilestones(params: {
  caller: CallerContext;
  input: ReorderMilestonesInput;
  deps: OperationDeps;
}): Promise<{ ordered: number }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to edit the timeline.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const { memorialId: rawId, orderedIds } = parsed.data;
  const memorialId = rawId as MemorialId;

  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ValidationError("The same milestone was listed twice.", { reason: "duplicate_id" });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "story.edit");
    const current = await repos.milestones.listForMemorial(memorialId);
    const currentIds = new Set(current.map((m) => m.id));
    if (orderedIds.length !== currentIds.size || !orderedIds.every((id) => currentIds.has(id))) {
      throw new ValidationError("The order must list every current milestone exactly once.", {
        reason: "order_mismatch",
      });
    }
    await repos.milestones.setOrder(orderedIds.map((id, i) => ({ id, displayOrder: i })));
    return { ordered: orderedIds.length };
  });
}
