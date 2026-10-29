import "server-only";
import type { PublicationStatus, SectionVisibility } from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface GalleryPhoto {
  id: string;
  albumId: string | null;
  caption: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  visibility: SectionVisibility;
  displayOrder: number;
  /** Short-lived signed URL (null if signing failed). */
  url: string | null;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  description: string | null;
  status: PublicationStatus;
  visibility: SectionVisibility;
  displayOrder: number;
}

export interface MemorialGallery {
  albums: GalleryAlbum[];
  photos: GalleryPhoto[];
  portraitMediaId: string | null;
  /** Chosen link-preview image, independent of the portrait. */
  coverMediaId: string | null;
}

const SIGNED_URL_TTL = 60 * 30; // 30 minutes

/** Albums + photos a family member can see, each photo with a signed URL. RLS-bound. */
export async function getMemorialGallery(memorialId: string): Promise<MemorialGallery> {
  const supabase = await getSupabaseServer();

  const [{ data: albums }, { data: media }, { data: memorial }] = await Promise.all([
    supabase
      .from("albums")
      .select("id, title, description, status, visibility, display_order")
      .eq("memorial_id", memorialId)
      .is("deleted_at", null)
      .order("display_order", { ascending: true }),
    supabase
      .from("media")
      .select(
        "id, album_id, storage_bucket, storage_path, caption, alt_text, width, height, visibility, display_order",
      )
      .eq("memorial_id", memorialId)
      .is("deleted_at", null)
      .order("display_order", { ascending: true }),
    supabase
      .from("memorials")
      .select("portrait_media_id, cover_media_id")
      .eq("id", memorialId)
      .maybeSingle(),
  ]);

  const rows = media ?? [];
  const byBucket = new Map<string, string[]>();
  for (const m of rows) {
    const list = byBucket.get(m.storage_bucket) ?? [];
    list.push(m.storage_path);
    byBucket.set(m.storage_bucket, list);
  }

  const urlByPath = new Map<string, string>();
  for (const [bucket, paths] of byBucket) {
    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, SIGNED_URL_TTL);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  return {
    albums: (albums ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      status: a.status as PublicationStatus,
      visibility: a.visibility as SectionVisibility,
      displayOrder: a.display_order,
    })),
    photos: rows.map((m) => ({
      id: m.id,
      albumId: m.album_id,
      caption: m.caption,
      altText: m.alt_text,
      width: m.width,
      height: m.height,
      visibility: m.visibility as SectionVisibility,
      displayOrder: m.display_order,
      url: urlByPath.get(m.storage_path) ?? null,
    })),
    portraitMediaId: memorial?.portrait_media_id ?? null,
    coverMediaId: memorial?.cover_media_id ?? null,
  };
}
