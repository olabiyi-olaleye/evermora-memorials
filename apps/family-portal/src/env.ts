import { createEnv, envField } from "@evermora/config/env";

/**
 * apps/family-portal environment contract.
 *
 * `NEXT_PUBLIC_SUPABASE_*` are client-safe (RLS-bound). `DATABASE_URL` and
 * `SUPABASE_SERVICE_ROLE_KEY` are server-only and must never reach the browser
 * — the `createEnv` proxy throws on a browser read.
 */
export function createFamilyPortalEnv(
  runtimeEnv: Record<string, string | undefined> = process.env,
) {
  return createEnv({
    server: {
      APP_ENV: envField.appEnv(),
      SUPABASE_SERVICE_ROLE_KEY: envField.nonEmpty(),
      // Direct Postgres connection for the domain layer's UnitOfWork (Drizzle).
      DATABASE_URL: envField.nonEmpty(),
    },
    client: {
      NEXT_PUBLIC_FAMILY_URL: envField.url(),
      // Public site (apps/web) — used to build shareable memorial + QR links.
      NEXT_PUBLIC_APP_URL: envField.url(),
      NEXT_PUBLIC_SUPABASE_URL: envField.url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envField.nonEmpty(),
    },
    runtimeEnv,
  });
}
