import { z } from "zod";
import { FUNERAL_PLANNING_STATUS, type MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * setFuneralPlanningStatus — records how far along the funeral arrangements
 * are (`not_started` → `planning` → `partially_confirmed` → `confirmed` →
 * `completed`). This is **independent** of the memorial's own lifecycle — a
 * memorial can be published while planning is `not_started`. `funeral.manage`.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  status: z.enum(FUNERAL_PLANNING_STATUS),
});

export type SetFuneralPlanningStatusInput = z.input<typeof InputSchema>;

export async function setFuneralPlanningStatus(params: {
  caller: CallerContext;
  input: SetFuneralPlanningStatusInput;
  deps: OperationDeps;
}): Promise<{ funeralPlanningStatus: string }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage funeral information.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await requireMemorialPermission(repos, caller, memorialId, "funeral.manage");
    if (memorial.funeralPlanningStatus === parsed.data.status) {
      return { funeralPlanningStatus: memorial.funeralPlanningStatus };
    }
    const updated = await repos.memorials.setFuneralPlanningStatus(memorialId, parsed.data.status);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.funeral_planning_changed",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { status: parsed.data.status },
    });
    return { funeralPlanningStatus: updated.funeralPlanningStatus };
  });
}
