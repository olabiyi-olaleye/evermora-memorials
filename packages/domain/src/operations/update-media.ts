import { z } from "zod";
import { SECTION_VISIBILITY, type MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { MediaPatch, MediaRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/** updateMedia — edit a photo's caption / alt text / album / visibility. `gallery.manage`. */

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    id: z.string().uuid(),
    albumId: z.string().uuid().nullable().optional(),
    caption: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(1000))
      .transform((s) => (s.length === 0 ? null : s))
      .nullable()
      .optional(),
    altText: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(500))
      .transform((s) => (s.length === 0 ? null : s))
      .nullable()
      .optional(),
    visibility: z.enum(SECTION_VISIBILITY).optional(),
  })
  .strict();

export type UpdateMediaInput = z.input<typeof InputSchema>;

const KEYS = ["albumId", "caption", "altText", "visibility"] as const;

export async function updateMedia(params: {
  caller: CallerContext;
  input: UpdateMediaInput;
  deps: OperationDeps;
}): Promise<{ media: MediaRow }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage photos.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const { memorialId: rawId, id, ...fields } = parsed.data;
  const memorialId = rawId as MemorialId;

  const patch: MediaPatch = {};
  for (const k of KEYS)
    if (k in fields && fields[k] !== undefined) (patch as Record<string, unknown>)[k] = fields[k];
  if (Object.keys(patch).length === 0) {
    throw new ValidationError("There are no changes to save.", { reason: "empty_patch" });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "gallery.manage");
    const existing = await repos.media.findById(id);
    if (!existing || existing.memorialId !== memorialId) {
      throw new NotFoundError("That photo does not exist.");
    }
    if (patch.albumId) {
      const album = await repos.albums.findById(patch.albumId);
      if (!album || album.memorialId !== memorialId) {
        throw new NotFoundError("That album does not exist.");
      }
    }
    const media = await repos.media.update(id, patch);
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "media.updated",
      entityType: "media",
      entityId: id,
      memorialId,
      metadata: { fields: Object.keys(patch) },
    });
    return { media };
  });
}
