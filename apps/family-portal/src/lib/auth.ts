import "server-only";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { AuthUser } from "@/lib/caller";

export { toCallerContext, type AuthUser } from "@/lib/caller";

/**
 * The signed-in family member, resolved **only** from the server-verified
 * Supabase session. Client-supplied `userId` / `role` / etc. are never trusted;
 * the domain layer re-checks every permission and RLS is the final boundary.
 */
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

/** Redirects to sign-in (preserving `next`) when there is no session. */
export async function requireAuthUser(nextPath?: string): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/sign-in${q}`);
  }
  return user;
}
