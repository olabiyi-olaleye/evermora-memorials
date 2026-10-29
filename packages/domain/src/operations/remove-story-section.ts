import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/** removeStorySection — soft-delete one story section. `story.edit`. */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  id: z.string().uuid(),
});

export type RemoveStorySectionInput = z.input<typeof InputSchema>;

export async function removeStorySection(params: {
  caller: CallerContext;
  input: RemoveStorySectionInput;
  deps: OperationDeps;
}): Promise<{ removed: true }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to edit the story.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "story.edit");
    const existing = await repos.story.findById(parsed.data.id);
    if (!existing || existing.memorialId !== memorialId) {
      throw new NotFoundError("That story section does not exist.");
    }
    await repos.story.softDelete(parsed.data.id);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "story_section.removed",
      entityType: "story_section",
      entityId: parsed.data.id,
      memorialId,
    });
    return { removed: true };
  });
}
