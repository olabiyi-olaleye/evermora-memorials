"use server";

import { revalidatePath } from "next/cache";
import {
  recordMedia,
  removeAlbum,
  removeMedia,
  reorderMedia,
  saveAlbum,
  setMemorialCover,
  setMemorialPortrait,
  updateMedia,
  type RemoveAlbumInput,
  type RemoveMediaInput,
  type ReorderMediaInput,
  type SaveAlbumInput,
  type SetMemorialCoverInput,
  type SetMemorialPortraitInput,
  type UpdateMediaInput,
} from "@evermora/domain";
import { inspectImage, type DetectedImageFormat } from "@evermora/utils";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";
import { MAX_PHOTO_BYTES, PHOTO_BUCKET } from "@/lib/media-constants";
import { getSupabaseServer } from "@/lib/supabase/server";

const ALLOW: DetectedImageFormat[] = ["jpeg", "png", "webp", "gif"];

function revalidate(memorialId: string) {
  revalidatePath("/");
  revalidatePath(`/memorials/${memorialId}`, "layout");
}

export interface FinalizePhotoUploadInput {
  memorialId: string;
  albumId?: string | null;
  storagePath: string;
}

/**
 * Finalize a photo the browser has already uploaded directly to Storage
 * (`getSupabaseBrowser().storage...upload`, authorized the same way a
 * server-side write would be — RLS checks the caller's session, not where
 * the request originates). Large files never pass through this function's
 * own request body, only this small JSON call does — Vercel's serverless
 * payload ceiling (~4.5 MB) doesn't apply to the actual photo.
 *
 * This is the authoritative security boundary: the uploaded bytes are
 * downloaded back server-side and validated exactly as before (magic bytes,
 * size, dimensions, EXIF strip). A file that fails is deleted from storage
 * and reported; nothing a client claims about the file is trusted.
 */
export async function finalizePhotoUploadAction(
  input: FinalizePhotoUploadInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const supabase = await getSupabaseServer();

  const expectedPrefix = `${input.memorialId}/gallery/`;
  if (!input.storagePath.startsWith(expectedPrefix)) {
    return { ok: false, error: { code: "invalid_input", message: "Invalid upload." } };
  }

  const { data: downloaded, error: downloadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .download(input.storagePath);
  if (downloadError || !downloaded) {
    return {
      ok: false,
      error: { code: "not_found", message: "The upload could not be found. Please try again." },
    };
  }

  const raw = new Uint8Array(await downloaded.arrayBuffer());
  const inspected = inspectImage(raw, {
    allow: ALLOW,
    maxBytes: MAX_PHOTO_BYTES,
    maxDimension: 12_000,
  });
  if (!inspected.ok) {
    await supabase.storage.from(PHOTO_BUCKET).remove([input.storagePath]);
    return { ok: false, error: { code: inspected.reason, message: inspected.message } };
  }

  // EXIF stripping changed the bytes — the object in storage must match.
  if (inspected.bytes.byteLength !== raw.byteLength) {
    const { error: reuploadError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(input.storagePath, inspected.bytes, {
        contentType: inspected.inspection.mimeType,
        upsert: true,
      });
    if (reuploadError) {
      await supabase.storage.from(PHOTO_BUCKET).remove([input.storagePath]);
      return {
        ok: false,
        error: { code: "internal", message: "The upload was rejected. Please try again." },
      };
    }
  }

  const recorded = await runOperation((deps) =>
    recordMedia({
      caller,
      input: {
        memorialId: input.memorialId,
        albumId: input.albumId ?? null,
        storageBucket: PHOTO_BUCKET,
        storagePath: input.storagePath,
        mimeType: inspected.inspection.mimeType,
        byteSize: inspected.bytes.byteLength,
        width: inspected.inspection.width,
        height: inspected.inspection.height,
      },
      deps,
    }),
  );

  if (!recorded.ok) {
    await supabase.storage.from(PHOTO_BUCKET).remove([input.storagePath]);
    return recorded;
  }

  revalidate(input.memorialId);
  return { ok: true, data: { id: recorded.data.media.id } };
}

export async function updatePhotoAction(
  input: UpdateMediaInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => updateMedia({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { id: result.data.media.id } } : result;
}

export async function removePhotoAction(
  input: RemoveMediaInput,
): Promise<ActionResult<{ removed: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => removeMedia({ caller, input, deps }));
  if (result.ok) {
    const supabase = await getSupabaseServer();
    await supabase.storage.from(result.data.storageBucket).remove([result.data.storagePath]);
    revalidate(input.memorialId);
    return { ok: true, data: { removed: true } };
  }
  return result;
}

export async function reorderPhotosAction(
  input: ReorderMediaInput,
): Promise<ActionResult<{ ordered: number }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => reorderMedia({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}

export async function setPortraitAction(
  input: SetMemorialPortraitInput,
): Promise<ActionResult<{ portraitMediaId: string | null }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => setMemorialPortrait({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}

export async function setCoverAction(
  input: SetMemorialCoverInput,
): Promise<ActionResult<{ coverMediaId: string | null }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => setMemorialCover({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}

export async function saveAlbumAction(
  input: SaveAlbumInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => saveAlbum({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { id: result.data.album.id } } : result;
}

export async function removeAlbumAction(
  input: RemoveAlbumInput,
): Promise<ActionResult<{ removed: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/photos`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => removeAlbum({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}
