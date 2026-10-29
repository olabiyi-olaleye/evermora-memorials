"use client";
import {
  createSupabaseBrowserClient,
  type EvermoraSupabaseClient,
} from "@evermora/database/supabase/browser";

let cached: EvermoraSupabaseClient | null = null;

/** Browser Supabase client (anon key; RLS applies). One instance per tab. */
export function getSupabaseBrowser(): EvermoraSupabaseClient {
  cached ??= createSupabaseBrowserClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  });
  return cached;
}
