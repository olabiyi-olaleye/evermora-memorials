import { createEnv, envField } from "@evermora/config/env";

/**
 * apps/platform-admin environment contract.
 *
 * `DATABASE_URL` is server-only — used by the RLS-scoped `UnitOfWork` for the
 * moderation operations. Platform-staff authority is enforced by
 * `app.is_platform_admin()` inside RLS; the direct connection is a transport,
 * not a bypass.
 */
export function createPlatformAdminEnv(
  runtimeEnv: Record<string, string | undefined> = process.env,
) {
  return createEnv({
    server: {
      APP_ENV: envField.appEnv(),
      SUPABASE_SERVICE_ROLE_KEY: envField.nonEmpty(),
      DATABASE_URL: envField.nonEmpty(),
    },
    client: {
      NEXT_PUBLIC_ADMIN_URL: envField.url(),
      NEXT_PUBLIC_SUPABASE_URL: envField.url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envField.nonEmpty(),
    },
    runtimeEnv,
  });
}
