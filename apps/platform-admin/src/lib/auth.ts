import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { AuthUser } from "@/lib/caller";

export { toCallerContext, type AuthUser } from "@/lib/caller";

/** The signed-in user, resolved only from the server-verified Supabase session. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    isPlatformAdmin: profile?.is_platform_admin ?? false,
  };
}

/**
 * Every admin route calls this. No session → `/sign-in`. Signed in but not
 * platform staff → the app layout shows a "not authorised" state (RLS would
 * hide everything anyway; this is the courtesy).
 */
export async function requirePlatformAdmin(nextPath?: string): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/sign-in${q}`);
  }
  return user;
}
