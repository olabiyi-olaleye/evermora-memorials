import { z } from "zod";
import { SECTION_VISIBILITY, type MemorialId, type ProfileId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { MediaRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * recordMedia — contract: `docs/domain/operations/record-media.md`.
 *
 * Creates the `media` row for a file the transport layer has ALREADY validated
 * (magic bytes, size, dimensions), EXIF-stripped, and stored in Supabase
 * Storage under an immutable `{memorial_id}/…` path. `gallery.manage`.
 *
 * The domain does not touch storage — it records metadata and enforces
 * authorization. `processing_status` is `ready` (MVP does no async transforms;
 * an image-processing provider is deferred, see the contract).
 */

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"] as const;

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  albumId: z.string().uuid().nullable().optional(),
  storageBucket: z.enum(["memorial-private"]),
  storagePath: z.string().min(1).max(500),
  mimeType: z.enum(IMAGE_MIME),
  byteSize: z.number().int().positive().max(26_214_400),
  width: z.number().int().positive().max(20_000).nullable().optional(),
  height: z.number().int().positive().max(20_000).nullable().optional(),
  checksum: z.string().max(128).nullable().optional(),
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
  visibility: z.enum(SECTION_VISIBILITY).default("inherit"),
});

export type RecordMediaInput = z.input<typeof InputSchema>;

export interface RecordMediaResult {
  media: MediaRow;
}

export async function recordMedia(params: {
  caller: CallerContext;
  input: RecordMediaInput;
  deps: OperationDeps;
}): Promise<RecordMediaResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to add photos.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The upload details are invalid.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;
  const memorialId = input.memorialId as MemorialId;

  // The storage path must start with the memorial id — never a name (§19).
  if (!input.storagePath.startsWith(`${memorialId}/`)) {
    throw new ValidationError("The storage path does not belong to this memorial.", {
      reason: "path_mismatch",
    });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "gallery.manage");

    if (input.albumId) {
      const album = await repos.albums.findById(input.albumId);
      if (!album || album.memorialId !== memorialId) {
        throw new NotFoundError("That album does not exist.");
      }
    }

    const siblings = await repos.media.listForMemorial(memorialId);
    const nextOrder = siblings.reduce((max, m) => Math.max(max, m.displayOrder + 1), 0);

    const media = await repos.media.create({
      id: deps.ids.newId(),
      memorialId,
      albumId: input.albumId ?? null,
      storageBucket: input.storageBucket,
      storagePath: input.storagePath,
      kind: "image",
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      width: input.width ?? null,
      height: input.height ?? null,
      checksum: input.checksum ?? null,
      caption: input.caption ?? null,
      altText: input.altText ?? null,
      visibility: input.visibility,
      displayOrder: nextOrder,
      uploadedBy: caller.userId as ProfileId,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "media.added",
      entityType: "media",
      entityId: media.id,
      memorialId,
      metadata: { bytes: media.byteSize, mime: media.mimeType },
    });

    return { media };
  });
}
