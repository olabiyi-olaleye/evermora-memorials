import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Browser Supabase client (family portal / admin client components).
 *
 * Only ever receives the publishable/anon key. Every request it makes is still
 * governed by Row Level Security. Never pass a service-role key here.
 */
export interface SupabaseBrowserConfig {
  url: string;
  anonKey: string;
}

export type EvermoraSupabaseClient = SupabaseClient<Database>;

export function createSupabaseBrowserClient(config: SupabaseBrowserConfig): EvermoraSupabaseClient {
  return createBrowserClient<Database>(config.url, config.anonKey);
}
