import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import type { EvermoraSupabaseClient } from "./browser";

export type { EvermoraSupabaseClient } from "./browser";

/**
 * Minimal cookie adapter. Next.js callers pass an object backed by
 * `cookies()` (Server Components / Route Handlers / Server Actions). Keeping the
 * seam framework-agnostic means `@evermora/database` never imports `next/*`.
 */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}

export interface SupabaseServerConfig {
  url: string;
  anonKey: string;
  cookies: CookieAdapter;
}

/**
 * Request-scoped, cookie-aware server client. Runs as the signed-in user (or
 * anonymous); RLS applies. Use this for every user-facing read/write on the
 * server.
 */
export function createSupabaseServerClient(config: SupabaseServerConfig): EvermoraSupabaseClient {
  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll: () => config.cookies.getAll(),
      setAll: (cookies) => {
        try {
          config.cookies.setAll(cookies);
        } catch {
          // setAll throws in Server Components; the middleware refresh handles it.
        }
      },
    },
  });
}

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

/**
 * Session-less anonymous client for public server reads (the public memorial
 * site). Runs as the `anon` Postgres role — RLS applies — and carries no
 * cookies. Never use it for a signed-in user's data.
 *
 * Reads are `cache: "no-store"`: a memorial page must reflect a family edit
 * (a new tribute approval, a privacy change) on the next request. Page-level
 * caching / ISR is a deliberate choice for the performance phase, not a
 * silent default from the fetch cache.
 */
export function createSupabasePublicClient(config: SupabasePublicConfig): EvermoraSupabaseClient {
  return createClient<Database>(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      // `cache: "no-store"` is Next.js's extension to RequestInit; the DB
      // package's lib doesn't type it, hence the cast. Harmless off-Next.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" } as RequestInit),
    },
  });
}

export interface SupabaseServiceRoleConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Service-role client. **Bypasses RLS.** Only construct this in trusted
 * server-only code (the domain layer, background jobs, webhooks) and never
 * expose its key to the browser. It carries no user session.
 */
export function createSupabaseServiceRoleClient(
  config: SupabaseServiceRoleConfig,
): EvermoraSupabaseClient {
  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
