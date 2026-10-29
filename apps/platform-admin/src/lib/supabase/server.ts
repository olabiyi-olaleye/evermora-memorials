import "server-only";
import { cookies } from "next/headers";
import {
  createSupabaseServerClient,
  type EvermoraSupabaseClient,
} from "@evermora/database/supabase/server";
import { serverEnv } from "@/lib/env";

/**
 * Request-scoped, cookie-aware Supabase client. Runs as the signed-in user (or
 * anonymous); RLS applies. `setAll` is a no-op in a Server Component render —
 * the proxy refresh writes the cookies.
 */
export async function getSupabaseServer(): Promise<EvermoraSupabaseClient> {
  const store = await cookies();
  return createSupabaseServerClient({
    url: serverEnv().NEXT_PUBLIC_SUPABASE_URL,
    anonKey: serverEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    cookies: {
      getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // called from a Server Component — the proxy handles the refresh
        }
      },
    },
  });
}
