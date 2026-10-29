import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/** removeFuneralEvent — soft-delete a funeral event. `funeral.manage`. */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export type RemoveFuneralEventInput = z.input<typeof InputSchema>;

export async function removeFuneralEvent(params: {
  caller: CallerContext;
  input: RemoveFuneralEventInput;
  deps: OperationDeps;
}): Promise<{ removed: true }> {
  const { caller, deps } = params;
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
    await repos.funeralEvents.softDelete(event.id);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "funeral_event.removed",
      entityType: "funeral_event",
      entityId: event.id,
      memorialId,
    });
    return { removed: true };
  });
}
