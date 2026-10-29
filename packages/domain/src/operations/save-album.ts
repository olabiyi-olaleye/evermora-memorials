import { z } from "zod";
import { SECTION_VISIBILITY, type MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { AlbumRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * saveAlbum — create or update a photo album. `gallery.manage`
 * (owner / admin / content_editor) or a platform admin.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  id: z.string().uuid().optional(),
  title: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "A title is required.").max(160)),
  description: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(2000))
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional(),
  visibility: z.enum(SECTION_VISIBILITY).default("inherit"),
  status: z.enum(["draft", "published"]).default("draft"),
});

export type SaveAlbumInput = z.input<typeof InputSchema>;

export interface SaveAlbumResult {
  album: AlbumRow;
  created: boolean;
}

export async function saveAlbum(params: {
  caller: CallerContext;
  input: SaveAlbumInput;
  deps: OperationDeps;
}): Promise<SaveAlbumResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage photos.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The album is invalid.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;
  const memorialId = input.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "gallery.manage");

    if (input.id) {
      const existing = await repos.albums.findById(input.id);
      if (!existing || existing.memorialId !== memorialId) {
        throw new NotFoundError("That album does not exist.");
      }
      const album = await repos.albums.update(input.id, {
        title: input.title,
        description: input.description ?? null,
        visibility: input.visibility,
        status: input.status,
      });
      await repos.audit.record({
        actorProfileId: caller.userId,
        actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
        action: "album.updated",
        entityType: "album",
        entityId: album.id,
        memorialId,
        metadata: { status: album.status },
      });
      return { album, created: false };
    }

    const siblings = await repos.albums.listForMemorial(memorialId);
    const nextOrder = siblings.reduce((max, a) => Math.max(max, a.displayOrder + 1), 0);
    const album = await repos.albums.create({
      id: deps.ids.newId(),
      memorialId,
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility,
      status: input.status,
      displayOrder: nextOrder,
    });
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "album.created",
      entityType: "album",
      entityId: album.id,
      memorialId,
      metadata: { status: album.status },
    });
    return { album, created: true };
  });
}
