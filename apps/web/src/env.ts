import { createEnv, envField } from "@evermora/config/env";

/**
 * apps/web environment contract.
 *
 * `DATABASE_URL` is server-only — used by the anonymous, RLS-scoped
 * `UnitOfWork` for visitor writes (tribute submission). The connection is a
 * transport, not an auth bypass: every statement runs as the `anon` role.
 */
export function createWebEnv(runtimeEnv: Record<string, string | undefined> = process.env) {
  return createEnv({
    server: {
      APP_ENV: envField.appEnv(),
      DATABASE_URL: envField.nonEmpty(),
    },
    client: {
      NEXT_PUBLIC_APP_URL: envField.url(),
      /** Authenticated family portal (apps/family-portal) — target of the
       *  "Create a Memorial" / "Sign In" marketing CTAs. Environment-aware so
       *  it follows preview / production / custom domains without a rebuild. */
      NEXT_PUBLIC_FAMILY_URL: envField.url(),
      NEXT_PUBLIC_SUPABASE_URL: envField.url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envField.nonEmpty(),
    },
    runtimeEnv,
  });
}
