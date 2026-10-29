import "server-only";
import type { MemorialRole } from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface TeamMember {
  id: string;
  profileId: string | null;
  name: string;
  role: MemorialRole;
  status: string;
  isYou: boolean;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: MemorialRole;
}

export interface MemorialTeam {
  members: TeamMember[];
  invites: PendingInvite[];
  youProfileId: string | null;
}

/** The people with access to a memorial, plus outstanding invitations. RLS-bound. */
export async function getMemorialTeam(memorialId: string): Promise<MemorialTeam> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows, error } = await supabase
    .from("memorial_memberships")
    .select("id, profile_id, invited_email, role, status, profiles!profile_id(display_name)")
    .eq("memorial_id", memorialId)
    .order("invited_at", { ascending: true });
  if (error) console.error("[getMemorialTeam]", error.message);

  const list = rows ?? [];
  const members: TeamMember[] = list
    .filter((r) => r.status !== "invited")
    .map((r) => {
      const p = r.profiles as unknown as { display_name: string } | null;
      return {
        id: r.id,
        profileId: r.profile_id,
        name: p?.display_name ?? "A family member",
        role: r.role as MemorialRole,
        status: r.status,
        isYou: Boolean(user && r.profile_id === user.id),
      };
    })
    .sort((a, b) => roleRank(a.role) - roleRank(b.role));

  const invites: PendingInvite[] = list
    .filter((r) => r.status === "invited")
    .map((r) => ({
      id: r.id,
      email: (r.invited_email as string | null) ?? "",
      role: r.role as MemorialRole,
    }));

  return { members, invites, youProfileId: user?.id ?? null };
}

const ORDER: MemorialRole[] = ["owner", "admin", "content_editor", "tribute_moderator", "viewer"];
function roleRank(role: MemorialRole): number {
  const i = ORDER.indexOf(role);
  return i === -1 ? ORDER.length : i;
}
