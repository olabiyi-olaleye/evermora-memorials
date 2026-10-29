import "server-only";
import { cache } from "react";
import { getPublicSupabase } from "@/lib/supabase";

export interface PublicTribute {
  id: string;
  authorDisplayName: string;
  authorRelationship: string | null;
  message: string;
  createdAt: string;
}

function toPublicTribute(t: {
  id: string | null;
  author_display_name: string | null;
  author_relationship: string | null;
  message: string | null;
  created_at: string | null;
}): PublicTribute {
  return {
    id: t.id as string,
    authorDisplayName: t.author_display_name as string,
    authorRelationship: t.author_relationship,
    message: t.message as string,
    createdAt: t.created_at as string,
  };
}

/** Every approved tribute for a published memorial, from the SECURITY DEFINER view. */
export const getPublicTributes = cache(async function getPublicTributes(
  memorialId: string,
): Promise<PublicTribute[]> {
  const supabase = getPublicSupabase();
  const { data } = await supabase
    .from("public_tributes")
    .select("id, author_display_name, author_relationship, message, created_at")
    .eq("memorial_id", memorialId)
    .order("published_at", { ascending: false });
  return (data ?? []).map(toPublicTribute);
});

/**
 * The main memorial page's excerpt: the most recent `limit` approved
 * tributes, plus whether there are more than that — so the page can offer
 * "View all tributes" (→ `/[slug]/tributes`, which reads the unlimited
 * `getPublicTributes` above) instead of listing every tribute a well-loved
 * memorial has ever received.
 */
export const getPublicTributesPreview = cache(async function getPublicTributesPreview(
  memorialId: string,
  limit: number,
): Promise<{ tributes: PublicTribute[]; hasMore: boolean }> {
  const supabase = getPublicSupabase();
  const { data } = await supabase
    .from("public_tributes")
    .select("id, author_display_name, author_relationship, message, created_at")
    .eq("memorial_id", memorialId)
    .order("published_at", { ascending: false })
    .limit(limit + 1); // one extra row, just to learn whether more exist
  const rows = (data ?? []).map(toPublicTribute);
  const hasMore = rows.length > limit;
  return { tributes: hasMore ? rows.slice(0, limit) : rows, hasMore };
});

export interface MyTribute {
  authorDisplayName: string;
  authorRelationship: string | null;
  message: string;
  status: "pending" | "approved" | "rejected" | "hidden" | "reported";
  createdAt: string;
}

/**
 * A visitor's own tribute, found only by their private edit token — for
 * pre-filling an edit form, and for showing it back to them in the public
 * list even while it's still `pending` (not yet in `getPublicTributes`).
 * Backed by the `resolve_tribute_edit_token` SECURITY DEFINER RPC; there is
 * no other way to read an unpublished tribute anonymously. Null for an
 * unknown/expired token.
 */
export async function getTributeByEditToken(editToken: string): Promise<MyTribute | null> {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .rpc("resolve_tribute_edit_token", { token: editToken })
    .maybeSingle();
  if (error || !data) return null;
  return {
    authorDisplayName: data.author_display_name,
    authorRelationship: data.author_relationship,
    message: data.message,
    status: data.status,
    createdAt: data.created_at,
  };
}
