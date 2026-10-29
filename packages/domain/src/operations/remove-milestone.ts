import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/** removeMilestone — soft-delete one timeline milestone. `story.edit`. */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  id: z.string().uuid(),
});

export type RemoveMilestoneInput = z.input<typeof InputSchema>;

export async function removeMilestone(params: {
  caller: CallerContext;
  input: RemoveMilestoneInput;
  deps: OperationDeps;
}): Promise<{ removed: true }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to edit the timeline.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "story.edit");
    const existing = await repos.milestones.findById(parsed.data.id);
    if (!existing || existing.memorialId !== memorialId) {
      throw new NotFoundError("That milestone does not exist.");
    }
    await repos.milestones.softDelete(parsed.data.id);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "milestone.removed",
      entityType: "milestone",
      entityId: parsed.data.id,
      memorialId,
    });
    return { removed: true };
  });
}
