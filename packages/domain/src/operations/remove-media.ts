import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * removeMedia — soft-delete a photo. Returns the storage location so the
 * transport can delete the object afterwards. If this photo was the memorial
 * portrait, its share-card cover, or an album cover, those references are
 * cleared in the same transaction. `gallery.manage`.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  id: z.string().uuid(),
});

export type RemoveMediaInput = z.input<typeof InputSchema>;

export interface RemoveMediaResult {
  removed: true;
  storageBucket: string;
  storagePath: string;
}

export async function removeMedia(params: {
  caller: CallerContext;
  input: RemoveMediaInput;
  deps: OperationDeps;
}): Promise<RemoveMediaResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage photos.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "gallery.manage");
    const media = await repos.media.findById(parsed.data.id);
    if (!media || media.memorialId !== memorialId) {
      throw new NotFoundError("That photo does not exist.");
    }

    // Clear a portrait or share-card cover reference that points at this photo.
    const memorial = await repos.memorials.findById(memorialId);
    if (memorial?.portraitMediaId === media.id) {
      await repos.memorials.setPortrait(memorialId, null);
    }
    if (memorial?.coverMediaId === media.id) {
      await repos.memorials.setCover(memorialId, null);
    }
    // Clear an album cover that points at this photo.
    if (media.albumId) {
      const album = await repos.albums.findById(media.albumId);
      if (album?.coverMediaId === media.id) {
        await repos.albums.update(album.id, { coverMediaId: null });
      }
    }

    await repos.media.softDelete(media.id);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "media.removed",
      entityType: "media",
      entityId: media.id,
      memorialId,
    });

    return {
      removed: true,
      storageBucket: media.storageBucket,
      storagePath: media.storagePath,
    };
  });
}
