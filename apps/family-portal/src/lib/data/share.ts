import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface ShareResolver {
  id: string;
  token: string;
  label: string | null;
  medium: string | null;
  isActive: boolean;
  createdAt: string;
  retiredAt: string | null;
}

export interface MemorialShare {
  canonicalSlug: string | null;
  published: boolean;
  sharingEnabled: boolean;
  qrCodeEnabled: boolean;
  resolvers: ShareResolver[];
}

/** Everything the share page needs. RLS-bound (members only for resolvers). */
export async function getMemorialShare(memorialId: string): Promise<MemorialShare> {
  const supabase = await getSupabaseServer();
  const [{ data: memorial }, { data: slugs }, { data: feature }, { data: resolvers }] =
    await Promise.all([
      supabase.from("memorials").select("status").eq("id", memorialId).maybeSingle(),
      supabase.from("memorial_slugs").select("slug, is_canonical").eq("memorial_id", memorialId),
      supabase
        .from("feature_settings")
        .select("sharing_enabled, qr_code_enabled")
        .eq("memorial_id", memorialId)
        .maybeSingle(),
      supabase
        .from("share_resolvers")
        .select("id, token, label, medium, is_active, created_at, retired_at")
        .eq("memorial_id", memorialId)
        .order("created_at", { ascending: false }),
    ]);

  return {
    canonicalSlug: (slugs ?? []).find((s) => s.is_canonical)?.slug ?? null,
    published: memorial?.status === "published",
    sharingEnabled: feature?.sharing_enabled ?? true,
    qrCodeEnabled: feature?.qr_code_enabled ?? true,
    resolvers: (resolvers ?? []).map((r) => ({
      id: r.id,
      token: r.token,
      label: r.label,
      medium: r.medium,
      isActive: r.is_active,
      createdAt: r.created_at,
      retiredAt: r.retired_at,
    })),
  };
}
