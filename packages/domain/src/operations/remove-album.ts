import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * removeAlbum — soft-delete an album. Its photos are NOT deleted — they are
 * detached from the album and stay in the memorial's library. `gallery.manage`.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  id: z.string().uuid(),
});

export type RemoveAlbumInput = z.input<typeof InputSchema>;

export async function removeAlbum(params: {
  caller: CallerContext;
  input: RemoveAlbumInput;
  deps: OperationDeps;
}): Promise<{ removed: true }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage photos.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "gallery.manage");
    const existing = await repos.albums.findById(parsed.data.id);
    if (!existing || existing.memorialId !== memorialId) {
      throw new NotFoundError("That album does not exist.");
    }
    await repos.media.clearAlbum(parsed.data.id);
    await repos.albums.softDelete(parsed.data.id);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "album.removed",
      entityType: "album",
      entityId: parsed.data.id,
      memorialId,
    });
    return { removed: true };
  });
}
