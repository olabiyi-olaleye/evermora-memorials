import "server-only";
import {
  createSupabasePublicClient,
  type EvermoraSupabaseClient,
} from "@evermora/database/supabase/server";
import { serverEnv } from "@/lib/env";

let cached: EvermoraSupabaseClient | null = null;

/**
 * Anonymous, session-less Supabase client for the public site. Runs as the
 * `anon` Postgres role, so Row Level Security is the boundary — a private or
 * unpublished memorial is simply not visible. No cookies, so reads stay
 * cacheable.
 */
export function getPublicSupabase(): EvermoraSupabaseClient {
  cached ??= createSupabasePublicClient({
    url: serverEnv().NEXT_PUBLIC_SUPABASE_URL,
    anonKey: serverEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cached;
}
