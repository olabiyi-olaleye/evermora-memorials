import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * reorderStorySections — set a new order for a memorial's story sections.
 * `orderedIds` must be exactly the memorial's current (non-deleted) section
 * ids, in the desired order. `story.edit`.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1).max(100),
});

export type ReorderStorySectionsInput = z.input<typeof InputSchema>;

export async function reorderStorySections(params: {
  caller: CallerContext;
  input: ReorderStorySectionsInput;
  deps: OperationDeps;
}): Promise<{ ordered: number }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to edit the story.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const { memorialId: rawId, orderedIds } = parsed.data;
  const memorialId = rawId as MemorialId;

  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ValidationError("The same section was listed twice.", { reason: "duplicate_id" });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "story.edit");

    const current = await repos.story.listForMemorial(memorialId);
    const currentIds = new Set(current.map((s) => s.id));
    if (orderedIds.length !== currentIds.size || !orderedIds.every((id) => currentIds.has(id))) {
      throw new ValidationError("The order must list every current section exactly once.", {
        reason: "order_mismatch",
      });
    }

    await repos.story.setOrder(orderedIds.map((id, i) => ({ id, displayOrder: i })));
    return { ordered: orderedIds.length };
  });
}
