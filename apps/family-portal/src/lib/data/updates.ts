import "server-only";
import type { PublicationStatus, SectionVisibility, UpdateImportance } from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface FamilyUpdate {
  id: string;
  title: string;
  body: string;
  importance: UpdateImportance;
  status: PublicationStatus;
  visibility: SectionVisibility;
  funeralEventId: string | null;
  publishedAt: string | null;
  createdAt: string;
}

/** Family updates a family member can see for a memorial. RLS-bound. */
export async function getMemorialUpdates(memorialId: string): Promise<FamilyUpdate[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("family_updates")
    .select(
      "id, title, body, importance, status, visibility, funeral_event_id, published_at, created_at",
    )
    .eq("memorial_id", memorialId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((u) => ({
    id: u.id,
    title: u.title,
    body: u.body,
    importance: u.importance as UpdateImportance,
    status: u.status as PublicationStatus,
    visibility: u.visibility as SectionVisibility,
    funeralEventId: u.funeral_event_id,
    publishedAt: u.published_at,
    createdAt: u.created_at,
  }));
}
