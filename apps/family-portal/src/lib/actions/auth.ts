"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/caller";

export type AuthActionState = { error: string | null; sent?: boolean };

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next") as string | null);

  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match. Please try again." };

  redirect(next);
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(formData.get("next") as string | null);

  if (!displayName) return { error: "Please tell us your name." };
  if (!email) return { error: "Enter your email." };
  if (password.length < 8) return { error: "Choose a password of at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) {
    if (error.message.toLowerCase().includes("registered")) {
      return { error: "There is already an account for that email. Try signing in." };
    }
    return { error: "We couldn't create your account. Please try again." };
  }

  // Local dev has email confirmation off → a session already exists.
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  const supabase = await getSupabaseServer();
  // Always report success — never disclose whether an address has an account.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_FAMILY_URL}/reset-password`,
  });
  return { error: null, sent: true };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Choose a password of at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "We couldn't update your password. The reset link may have expired." };
  redirect("/");
}
