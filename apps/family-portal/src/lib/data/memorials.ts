import "server-only";
import { cache } from "react";
import type {
  MemorialGender,
  MemorialRole,
  MemorialStatus,
  MemorialVisibility,
} from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface DashboardMemorial {
  id: string;
  fullName: string;
  status: MemorialStatus;
  role: MemorialRole;
  canonicalSlug: string | null;
  publishedAt: string | null;
  /** Tributes awaiting a moderation decision — drives the sidebar count. */
  pendingTributeCount: number;
}

/** The memorials the signed-in user is an active member of. RLS-bound. */
export async function listMyMemorials(profileId: string): Promise<DashboardMemorial[]> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("memorial_memberships")
    .select(
      "role, memorial:memorials(id, full_name, status, published_at, memorial_slugs(slug, is_canonical))",
    )
    .eq("profile_id", profileId)
    .eq("status", "active");

  if (error || !data) return [];

  const memorials = data
    .filter((row) => row.memorial)
    .map((row) => {
      const m = row.memorial as unknown as {
        id: string;
        full_name: string;
        status: MemorialStatus;
        published_at: string | null;
        memorial_slugs: { slug: string; is_canonical: boolean }[];
      };
      return {
        id: m.id,
        fullName: m.full_name,
        status: m.status,
        role: row.role as MemorialRole,
        canonicalSlug: m.memorial_slugs.find((s) => s.is_canonical)?.slug ?? null,
        publishedAt: m.published_at,
        pendingTributeCount: 0,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Pending-tribute counts, one query for every memorial the user can see.
  const ids = memorials.map((m) => m.id);
  if (ids.length > 0) {
    const { data: pending } = await supabase
      .from("tributes")
      .select("memorial_id")
      .in("memorial_id", ids)
      .is("deleted_at", null)
      .in("status", ["pending", "reported"]);
    if (pending) {
      const byId = new Map<string, number>();
      for (const row of pending) {
        byId.set(row.memorial_id, (byId.get(row.memorial_id) ?? 0) + 1);
      }
      for (const m of memorials) m.pendingTributeCount = byId.get(m.id) ?? 0;
    }
  }

  return memorials;
}

export interface MemorialProfile {
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
}

export interface MemorialFeatureSettings {
  tributesEnabled: boolean;
  tributeModerationEnabled: boolean;
  photoContributionsEnabled: boolean;
  candlesEnabled: boolean;
  funeralEnabled: boolean;
  updatesEnabled: boolean;
  sharingEnabled: boolean;
}

export interface MemorialDetail {
  id: string;
  status: MemorialStatus;
  funeralPlanningStatus: string;
  role: MemorialRole;
  canonicalSlug: string | null;
  aliases: string[];
  publishedAt: string | null;
  profile: MemorialProfile;
  visibility: MemorialVisibility;
  searchIndexingEnabled: boolean;
  features: MemorialFeatureSettings;
  /** Tributes awaiting a moderation decision. */
  pendingTributeCount: number;
  /** Published family updates, most recent first (title + date only). */
  recentUpdates: { id: string; title: string; publishedAt: string | null }[];
  /** Published, non-deleted story sections — drives the publish content bar. */
  publishedStoryCount: number;
}

/**
 * One memorial the user can see, with everything the family surfaces need.
 * Null when not visible. Wrapped in `cache()` so the memorial layout and its
 * child page share a single fetch per request.
 */
export const getMemorialDetail = cache(async function getMemorialDetail(
  memorialId: string,
): Promise<MemorialDetail | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memorial, error: memorialError } = await supabase
    .from("memorials")
    .select(
      "id, status, funeral_planning_status, published_at, full_name, preferred_name, headline, survived_by, gender, biography_summary, date_of_birth, birth_year_only, date_of_death, birth_place, resting_place",
    )
    .eq("id", memorialId)
    .maybeSingle();
  if (memorialError) console.error("[getMemorialDetail]", memorialError.message);
  if (!memorial) return null;

  const [{ data: slugs }, { data: membership }, { data: privacy }, { data: features }] =
    await Promise.all([
      supabase.from("memorial_slugs").select("slug, is_canonical").eq("memorial_id", memorialId),
      supabase
        .from("memorial_memberships")
        .select("role")
        .eq("memorial_id", memorialId)
        .eq("status", "active")
        .eq("profile_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
        .maybeSingle(),
      supabase
        .from("privacy_settings")
        .select("visibility, search_indexing_enabled")
        .eq("memorial_id", memorialId)
        .maybeSingle(),
      supabase
        .from("feature_settings")
        .select(
          "tributes_enabled, tribute_moderation_enabled, photo_contributions_enabled, candles_enabled, funeral_enabled, updates_enabled, sharing_enabled",
        )
        .eq("memorial_id", memorialId)
        .maybeSingle(),
    ]);

  const [{ count: pendingTributeCount }, { data: updates }, { count: publishedStoryCount }] =
    await Promise.all([
      supabase
        .from("tributes")
        .select("id", { count: "exact", head: true })
        .eq("memorial_id", memorialId)
        .is("deleted_at", null)
        .in("status", ["pending", "reported"]),
      supabase
        .from("family_updates")
        .select("id, title, published_at")
        .eq("memorial_id", memorialId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3),
      supabase
        .from("story_sections")
        .select("id", { count: "exact", head: true })
        .eq("memorial_id", memorialId)
        .eq("status", "published")
        .is("deleted_at", null),
    ]);

  return {
    id: memorial.id,
    status: memorial.status,
    funeralPlanningStatus: memorial.funeral_planning_status,
    role: (membership?.role ?? "viewer") as MemorialRole,
    canonicalSlug: slugs?.find((s) => s.is_canonical)?.slug ?? null,
    aliases: (slugs ?? []).filter((s) => !s.is_canonical).map((s) => s.slug),
    publishedAt: memorial.published_at,
    profile: {
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
      restingPlace: memorial.resting_place,
    },
    visibility: (privacy?.visibility ?? "private") as MemorialVisibility,
    searchIndexingEnabled: privacy?.search_indexing_enabled ?? false,
    features: {
      tributesEnabled: features?.tributes_enabled ?? true,
      tributeModerationEnabled: features?.tribute_moderation_enabled ?? true,
      photoContributionsEnabled: features?.photo_contributions_enabled ?? false,
      candlesEnabled: features?.candles_enabled ?? true,
      funeralEnabled: features?.funeral_enabled ?? true,
      updatesEnabled: features?.updates_enabled ?? true,
      sharingEnabled: features?.sharing_enabled ?? true,
    },
    pendingTributeCount: pendingTributeCount ?? 0,
    recentUpdates: (updates ?? []).map((u) => ({
      id: u.id,
      title: u.title,
      publishedAt: u.published_at,
    })),
    publishedStoryCount: publishedStoryCount ?? 0,
  };
});
