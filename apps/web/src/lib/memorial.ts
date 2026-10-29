import "server-only";
import { cache } from "react";
import type {
  FuneralEventContact,
  FuneralPlanningStatus,
  MemorialGender,
  MemorialVisibility,
} from "@evermora/types";
import { parseEventContacts, type Coordinates } from "@evermora/utils";
import { getPublicSupabase } from "@/lib/supabase";
import { isReservedRoute } from "@/lib/reserved-routes";

export interface SlugResolution {
  memorialId: string;
  canonicalSlug: string;
  isAlias: boolean;
  redirectEnabled: boolean;
}

/**
 * Resolve a public URL segment to a memorial. Uses the `resolve_memorial_slug`
 * SQL resolver (security definer) — it maps a canonical slug OR a historical
 * alias to the memorial id and its current canonical slug. Returns null when
 * nothing matches (→ 404). Does NOT check visibility; the caller then loads the
 * memorial through RLS, which is what actually gates access.
 */
export const resolveSlug = cache(async function resolveSlug(
  lookup: string,
): Promise<SlugResolution | null> {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase.rpc("resolve_memorial_slug", { lookup }).maybeSingle();
  if (error || !data) return null;
  return {
    memorialId: data.memorial_id as string,
    canonicalSlug: data.canonical_slug as string,
    isAlias: data.is_alias as boolean,
    redirectEnabled: data.redirect_enabled as boolean,
  };
});

export type PublicMemorialResolution =
  | { kind: "not_found" }
  | { kind: "redirect"; to: string }
  | { kind: "ok"; memorial: PublicMemorial };

/**
 * The slug → memorial resolution shared by every public route rooted at
 * `[slug]` (the memorial page itself, and its `/story` sub-page): reserved
 * route check → alias/canonical resolution → the RLS-gated memorial read.
 * A private/unpublished memorial and an unknown slug are indistinguishable
 * (`not_found`) so neither leaks that it exists.
 */
export async function resolvePublicMemorial(slugParam: string): Promise<PublicMemorialResolution> {
  const slug = decodeURIComponent(slugParam).toLowerCase();
  if (isReservedRoute(slug)) return { kind: "not_found" };

  const resolution = await resolveSlug(slug);
  if (!resolution) return { kind: "not_found" };

  if (resolution.isAlias && resolution.redirectEnabled && resolution.canonicalSlug !== slug) {
    return { kind: "redirect", to: `/${resolution.canonicalSlug}` };
  }

  const memorial = await getPublicMemorial(resolution.memorialId);
  if (!memorial) return { kind: "not_found" };
  return { kind: "ok", memorial };
}

export interface PublicMemorial {
  id: string;
  canonicalSlug: string;
  fullName: string;
  preferredName: string | null;
  headline: string | null;
  survivedBy: string | null;
  gender: MemorialGender | null;
  biographySummary: string | null;
  dateOfBirth: string | null;
  birthYearOnly: boolean;
  dateOfDeath: string | null;
  birthPlace: string | null;
  restingPlace: string | null;
  visibility: MemorialVisibility;
  /** Whether the family opted this public memorial into search-engine indexing. */
  searchIndexingEnabled: boolean;
  /** True only when a member/admin would also be able to see the resting place. */
  restingPlaceVisible: boolean;
  portraitMediaId: string | null;
  /** Chosen link-preview image, independent of the portrait shown on the page. */
  coverMediaId: string | null;
  tributesEnabled: boolean;
  tributeModerationEnabled: boolean;
  funeralEnabled: boolean;
  /** Family's own read on planning progress — drives the "no events yet" placeholder copy. */
  funeralPlanningStatus: FuneralPlanningStatus;
  updatesEnabled: boolean;
}

export interface PublicStorySection {
  id: string;
  title: string;
  body: string;
}

export interface PublicPhoto {
  id: string;
  caption: string | null;
  altText: string | null;
  width: number | null;
  height: number | null;
  url: string | null;
}

export interface PublicMilestone {
  id: string;
  year: number;
  onDate: string | null;
  title: string;
  description: string | null;
}

/**
 * Load a memorial for public rendering. RLS (anon role) is the boundary:
 * a private or unpublished memorial returns null → the route 404s, so its
 * existence is never confirmed. `restingPlace` is additionally gated by the
 * per-section privacy toggle.
 */
export const getPublicMemorial = cache(async function getPublicMemorial(
  memorialId: string,
): Promise<PublicMemorial | null> {
  const supabase = getPublicSupabase();

  const [{ data: memorial }, { data: slug }, { data: privacy }, { data: feature }] =
    await Promise.all([
      supabase
        .from("memorials")
        .select(
          "id, full_name, preferred_name, headline, survived_by, gender, biography_summary, date_of_birth, birth_year_only, date_of_death, birth_place, resting_place, portrait_media_id, cover_media_id, funeral_planning_status",
        )
        .eq("id", memorialId)
        .maybeSingle(),
      supabase
        .from("memorial_slugs")
        .select("slug")
        .eq("memorial_id", memorialId)
        .eq("is_canonical", true)
        .maybeSingle(),
      supabase
        .from("privacy_settings")
        .select("visibility, search_indexing_enabled, resting_place_visibility")
        .eq("memorial_id", memorialId)
        .maybeSingle(),
      supabase
        .from("feature_settings")
        .select("tributes_enabled, tribute_moderation_enabled, funeral_enabled, updates_enabled")
        .eq("memorial_id", memorialId)
        .maybeSingle(),
    ]);

  if (!memorial || !slug) return null;

  // Mirrors app.can_read_memorial_section for a non-member: a section is public
  // when its visibility is `inherit` (defers to the memorial-level check we've
  // already passed) or `public`. Default `members` hides it from visitors.
  const restingPlaceVisible = ["inherit", "public"].includes(
    privacy?.resting_place_visibility ?? "members",
  );

  return {
    id: memorial.id,
    canonicalSlug: slug.slug,
    fullName: memorial.full_name,
    preferredName: memorial.preferred_name,
    headline: memorial.headline,
    survivedBy: memorial.survived_by,
    gender: (memorial.gender as MemorialGender | null) ?? null,
    biographySummary: memorial.biography_summary,
    dateOfBirth: memorial.date_of_birth,
    birthYearOnly: memorial.birth_year_only,
    dateOfDeath: memorial.date_of_death,
    birthPlace: memorial.birth_place,
    restingPlace: restingPlaceVisible ? memorial.resting_place : null,
    visibility: (privacy?.visibility ?? "private") as MemorialVisibility,
    searchIndexingEnabled: privacy?.search_indexing_enabled ?? false,
    restingPlaceVisible,
    portraitMediaId: (memorial.portrait_media_id as string | null) ?? null,
    coverMediaId: (memorial.cover_media_id as string | null) ?? null,
    tributesEnabled: feature?.tributes_enabled ?? true,
    tributeModerationEnabled: feature?.tribute_moderation_enabled ?? true,
    funeralEnabled: feature?.funeral_enabled ?? true,
    funeralPlanningStatus: memorial.funeral_planning_status as FuneralPlanningStatus,
    updatesEnabled: feature?.updates_enabled ?? true,
  };
});

export interface PublicFuneralEvent {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  status: "published" | "cancelled" | "completed";
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
  venueName: string | null;
  addressLine: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  dressCode: string | null;
  contacts: FuneralEventContact[];
  livestreamUrl: string | null;
  instructions: string | null;
  mapQuery: string | null;
  /** The family's exact venue pin, when they set one — precise where `mapQuery` is a guess. */
  coordinates: Coordinates | null;
  cancelReason: string | null;
}

/**
 * Funeral / memorial events shown on the public page. RLS (anon) already limits
 * this to published events whose own visibility is `inherit` or `public` on a
 * memorial whose `funeral_events` section is readable (§39 — the whole event
 * card shows or it doesn't). Cancelled events stay visible, clearly marked.
 */
export const getPublicFuneral = cache(async function getPublicFuneral(
  memorialId: string,
): Promise<PublicFuneralEvent[]> {
  const supabase = getPublicSupabase();
  const { data } = await supabase
    .from("funeral_events")
    .select(
      "id, event_type, status, title, description, event_date, start_time, end_time, timezone, venue_name, address_line, city, region, country, latitude, longitude, dress_code, contacts, livestream_url, instructions, cancel_reason, display_order",
    )
    .eq("memorial_id", memorialId)
    .in("status", ["published", "cancelled", "completed"])
    .is("deleted_at", null)
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("display_order", { ascending: true });

  return (data ?? []).map((e) => {
    const place = [e.venue_name, e.address_line, e.city, e.region, e.country]
      .filter(Boolean)
      .join(", ");
    return {
      id: e.id as string,
      eventType: e.event_type as string,
      title: e.title as string,
      description: (e.description as string | null) ?? null,
      status: e.status as PublicFuneralEvent["status"],
      eventDate: (e.event_date as string | null) ?? null,
      startTime: (e.start_time as string | null) ?? null,
      endTime: (e.end_time as string | null) ?? null,
      timezone: (e.timezone as string | null) ?? null,
      venueName: (e.venue_name as string | null) ?? null,
      addressLine: (e.address_line as string | null) ?? null,
      city: (e.city as string | null) ?? null,
      region: (e.region as string | null) ?? null,
      country: (e.country as string | null) ?? null,
      dressCode: (e.dress_code as string | null) ?? null,
      contacts: parseEventContacts(e.contacts),
      livestreamUrl: (e.livestream_url as string | null) ?? null,
      instructions: (e.instructions as string | null) ?? null,
      mapQuery: place || null,
      coordinates:
        e.latitude != null && e.longitude != null
          ? { latitude: Number(e.latitude), longitude: Number(e.longitude) }
          : null,
      cancelReason: (e.cancel_reason as string | null) ?? null,
    };
  });
});

export interface PublicFamilyUpdate {
  id: string;
  title: string;
  body: string;
  importance: "normal" | "high" | "urgent";
  publishedAt: string | null;
}

/**
 * Published, publicly-visible family updates for a memorial. RLS (anon) already
 * limits this to published updates whose own visibility is `inherit`/`public`
 * on a memorial whose `updates` section is readable. Newest first.
 */
export const getPublicUpdates = cache(async function getPublicUpdates(
  memorialId: string,
): Promise<PublicFamilyUpdate[]> {
  const supabase = getPublicSupabase();
  const { data } = await supabase
    .from("family_updates")
    .select("id, title, body, importance, published_at")
    .eq("memorial_id", memorialId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  return (data ?? []).map((u) => ({
    id: u.id as string,
    title: u.title as string,
    body: u.body as string,
    importance: (u.importance as PublicFamilyUpdate["importance"]) ?? "normal",
    publishedAt: (u.published_at as string | null) ?? null,
  }));
});

const SIGNED_URL_TTL = 60 * 60; // 1 hour

async function signPaths(
  supabase: ReturnType<typeof getPublicSupabase>,
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGNED_URL_TTL);
  for (const s of data ?? []) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  return out;
}

/**
 * The public gallery: portrait + photos in published, publicly-visible albums.
 * RLS (anon) filters `media` to `processing_status = 'ready'` on a
 * photos-public memorial, and the extended `memorial-private read` storage
 * policy lets the anon key mint signed URLs for exactly those objects.
 */
export const getPublicGallery = cache(async function getPublicGallery(
  memorialId: string,
  portraitMediaId: string | null,
  coverMediaId?: string | null,
): Promise<{ portrait: PublicPhoto | null; cover: PublicPhoto | null; photos: PublicPhoto[] }> {
  const supabase = getPublicSupabase();

  const { data: albums } = await supabase
    .from("albums")
    .select("id")
    .eq("memorial_id", memorialId)
    .eq("status", "published")
    .is("deleted_at", null);
  const albumIds = new Set((albums ?? []).map((a) => a.id));

  const { data: media } = await supabase
    .from("media")
    .select(
      "id, album_id, storage_bucket, storage_path, caption, alt_text, width, height, display_order",
    )
    .eq("memorial_id", memorialId)
    .eq("processing_status", "ready")
    .is("deleted_at", null)
    .order("display_order", { ascending: true });

  const rows = media ?? [];
  const paths = new Map<string, string[]>();
  for (const m of rows) {
    const l = paths.get(m.storage_bucket) ?? [];
    l.push(m.storage_path);
    paths.set(m.storage_bucket, l);
  }
  const urls = new Map<string, string>();
  for (const [bucket, ps] of paths) {
    for (const [k, v] of await signPaths(supabase, bucket, ps)) urls.set(k, v);
  }

  const toPhoto = (m: (typeof rows)[number]): PublicPhoto => ({
    id: m.id,
    caption: m.caption,
    altText: m.alt_text,
    width: m.width,
    height: m.height,
    url: urls.get(m.storage_path) ?? null,
  });

  const portrait = portraitMediaId ? (rows.find((m) => m.id === portraitMediaId) ?? null) : null;
  const cover = coverMediaId ? (rows.find((m) => m.id === coverMediaId) ?? null) : null;

  const photos = rows
    .filter((m) => m.album_id && albumIds.has(m.album_id))
    .map(toPhoto)
    .filter((p) => p.url);

  return {
    portrait: portrait ? toPhoto(portrait) : null,
    cover: cover ? toPhoto(cover) : null,
    photos,
  };
});

/**
 * Published, story-visible story sections for a memorial. RLS (anon) already
 * filters to `status = 'published'` AND the `story` section visibility check —
 * this only runs after `getPublicMemorial` has confirmed the memorial is
 * visible.
 */
export const getPublicStory = cache(async function getPublicStory(
  memorialId: string,
): Promise<{ sections: PublicStorySection[]; milestones: PublicMilestone[] }> {
  const supabase = getPublicSupabase();
  const [{ data: sections }, { data: milestones }] = await Promise.all([
    supabase
      .from("story_sections")
      .select("id, title, body, display_order")
      .eq("memorial_id", memorialId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order", { ascending: true }),
    supabase
      .from("milestones")
      .select("id, year, on_date, title, description, display_order")
      .eq("memorial_id", memorialId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("year", { ascending: true })
      .order("display_order", { ascending: true }),
  ]);

  return {
    sections: (sections ?? []).map((s) => ({ id: s.id, title: s.title, body: s.body })),
    milestones: (milestones ?? []).map((m) => ({
      id: m.id,
      year: m.year,
      onDate: m.on_date,
      title: m.title,
      description: m.description,
    })),
  };
});
