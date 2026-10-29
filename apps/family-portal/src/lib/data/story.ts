import "server-only";
import type { PublicationStatus, SectionVisibility, StorySectionKind } from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface StorySection {
  id: string;
  kind: StorySectionKind;
  title: string;
  body: string;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

export interface Milestone {
  id: string;
  year: number;
  onDate: string | null;
  title: string;
  description: string | null;
  visibility: SectionVisibility;
  status: PublicationStatus;
  displayOrder: number;
}

/** Story sections + milestones a family member can see for a memorial. RLS-bound. */
export async function getMemorialStory(
  memorialId: string,
): Promise<{ sections: StorySection[]; milestones: Milestone[] }> {
  const supabase = await getSupabaseServer();
  const [{ data: sections }, { data: milestones }] = await Promise.all([
    supabase
      .from("story_sections")
      .select("id, kind, title, body, visibility, status, display_order")
      .eq("memorial_id", memorialId)
      .is("deleted_at", null)
      .order("display_order", { ascending: true }),
    supabase
      .from("milestones")
      .select("id, year, on_date, title, description, visibility, status, display_order")
      .eq("memorial_id", memorialId)
      .is("deleted_at", null)
      .order("year", { ascending: true })
      .order("display_order", { ascending: true }),
  ]);

  return {
    sections: (sections ?? []).map((s) => ({
      id: s.id,
      kind: s.kind as StorySectionKind,
      title: s.title,
      body: s.body,
      visibility: s.visibility as SectionVisibility,
      status: s.status as PublicationStatus,
      displayOrder: s.display_order,
    })),
    milestones: (milestones ?? []).map((m) => ({
      id: m.id,
      year: m.year,
      onDate: m.on_date,
      title: m.title,
      description: m.description,
      visibility: m.visibility as SectionVisibility,
      status: m.status as PublicationStatus,
      displayOrder: m.display_order,
    })),
  };
}
