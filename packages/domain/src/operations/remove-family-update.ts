import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/** removeFamilyUpdate — soft-delete a family update. `updates.publish`. */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  updateId: z.string().uuid(),
});

export type RemoveFamilyUpdateInput = z.input<typeof InputSchema>;

export async function removeFamilyUpdate(params: {
  caller: CallerContext;
  input: RemoveFamilyUpdateInput;
  deps: OperationDeps;
}): Promise<{ removed: true }> {
  const { caller, deps } = params;
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
    await repos.familyUpdates.softDelete(update.id);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "family_update.removed",
      entityType: "family_update",
      entityId: update.id,
      memorialId,
    });
    return { removed: true };
  });
}
