import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import {
  NotFoundError,
  PreconditionFailedError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * setMemorialPortrait — choose (or clear) the portrait shown at the top of the
 * memorial. The photo must be a `ready`, non-deleted media row belonging to
 * this memorial. `memorial.edit` (the RLS-aligned permission for writing
 * `memorials`).
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  mediaId: z.string().uuid().nullable(),
});

export type SetMemorialPortraitInput = z.input<typeof InputSchema>;

export async function setMemorialPortrait(params: {
  caller: CallerContext;
  input: SetMemorialPortraitInput;
  deps: OperationDeps;
}): Promise<{ portraitMediaId: string | null }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to change the portrait.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;
  const mediaId = parsed.data.mediaId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "memorial.edit");

    if (mediaId) {
      const media = await repos.media.findById(mediaId);
      if (!media || media.memorialId !== memorialId) {
        throw new NotFoundError("That photo does not exist.");
      }
      if (media.processingStatus !== "ready") {
        throw new PreconditionFailedError("That photo isn't ready yet.", {
          reason: "media_not_ready",
        });
      }
    }

    const updated = await repos.memorials.setPortrait(memorialId, mediaId);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.portrait_changed",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { portraitMediaId: mediaId },
    });
    return { portraitMediaId: updated.portraitMediaId };
  });
}
