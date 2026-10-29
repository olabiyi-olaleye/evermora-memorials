/**
 * @evermora/database — database infrastructure.
 *
 * Migration authority: the SQL files in `supabase/migrations/`, applied via the
 * Supabase CLI. Drizzle is used for typed queries and transactions only; it is
 * NOT a competing migration authority. See docs/architecture for details.
 *
 *   supabase-js (@supabase/ssr)  -> user-scoped, RLS-enforced access
 *   Drizzle (postgres-js)        -> server-only typed queries / transactions
 */

// Supabase clients
export {
  createSupabaseBrowserClient,
  type SupabaseBrowserConfig,
  type EvermoraSupabaseClient,
} from "./supabase/browser";
export {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
  type SupabaseServerConfig,
  type SupabaseServiceRoleConfig,
  type CookieAdapter,
} from "./supabase/server";
export type { Database, Json } from "./supabase/database.types";

// Drizzle (server-only)
export { createDrizzleClient, type EvermoraDb } from "./drizzle/client";

// Persistence adapters — concrete implementations of the @evermora/domain ports
export {
  createUnitOfWork,
  buildRepositories,
  establishRlsContext,
  translatePgError,
  uuidIdGenerator,
  type RlsContext,
} from "./persistence/index";

// Connection-string helpers
export { redactConnectionString, isLocalConnection } from "./connection-string";
