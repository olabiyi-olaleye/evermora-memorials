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
 * setMemorialCover — choose (or clear) the image used for the memorial's
 * link-preview card (WhatsApp/iMessage/Slack/etc.), independent of the
 * portrait shown on the memorial page itself. A family may want a different
 * photo to represent the person in a shared link than the one leading the
 * page — or none at all, in which case the share image falls back to the
 * portrait, then the first gallery photo, then initials (`share-image.tsx`
 * in `apps/web`, not this operation's concern).
 *
 * Mirrors setMemorialPortrait exactly: same validation, same permission
 * (`memorial.edit` — the write lands on `memorials`, matching
 * `memorials_update_editors`), same shape.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  mediaId: z.string().uuid().nullable(),
});

export type SetMemorialCoverInput = z.input<typeof InputSchema>;

export async function setMemorialCover(params: {
  caller: CallerContext;
  input: SetMemorialCoverInput;
  deps: OperationDeps;
}): Promise<{ coverMediaId: string | null }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to change the share image.");
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

    const updated = await repos.memorials.setCover(memorialId, mediaId);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.cover_changed",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { coverMediaId: mediaId },
    });
    return { coverMediaId: updated.coverMediaId };
  });
}
