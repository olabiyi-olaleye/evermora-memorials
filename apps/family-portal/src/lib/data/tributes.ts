import "server-only";
import type { TributeStatus } from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface FamilyTribute {
  id: string;
  status: TributeStatus;
  authorDisplayName: string;
  authorRelationship: string | null;
  authorEmail: string | null;
  message: string;
  createdAt: string;
  moderatedAt: string | null;
}

/** Every tribute on a memorial (all statuses). RLS: members / moderators / platform admins. */
export async function getMemorialTributes(memorialId: string): Promise<FamilyTribute[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("tributes")
    .select(
      "id, status, author_display_name, author_relationship, author_email, message, created_at, moderated_at",
    )
    .eq("memorial_id", memorialId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []).map((t) => ({
    id: t.id,
    status: t.status as TributeStatus,
    authorDisplayName: t.author_display_name,
    authorRelationship: t.author_relationship,
    authorEmail: t.author_email,
    message: t.message,
    createdAt: t.created_at,
    moderatedAt: t.moderated_at,
  }));
}
