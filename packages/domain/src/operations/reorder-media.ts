import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * reorderMedia — set an explicit order for a memorial's photos (or the subset
 * in one album). `orderedIds` must be a subset of the memorial's current
 * non-deleted media ids, with no duplicates. `gallery.manage`.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1).max(500),
});

export type ReorderMediaInput = z.input<typeof InputSchema>;

export async function reorderMedia(params: {
  caller: CallerContext;
  input: ReorderMediaInput;
  deps: OperationDeps;
}): Promise<{ ordered: number }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage photos.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const { memorialId: rawId, orderedIds } = parsed.data;
  const memorialId = rawId as MemorialId;

  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ValidationError("The same photo was listed twice.", { reason: "duplicate_id" });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "gallery.manage");
    const current = new Set((await repos.media.listForMemorial(memorialId)).map((m) => m.id));
    if (!orderedIds.every((id) => current.has(id))) {
      throw new ValidationError("The order references a photo that isn't in this memorial.", {
        reason: "unknown_id",
      });
    }
    await repos.media.setOrder(orderedIds.map((id, i) => ({ id, displayOrder: i })));
    return { ordered: orderedIds.length };
  });
}
