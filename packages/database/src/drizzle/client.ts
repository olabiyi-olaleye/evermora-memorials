import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type EvermoraDb = ReturnType<typeof createDrizzleClient>;

/**
 * Server-only Drizzle client (postgres-js) over the direct `DATABASE_URL`.
 *
 * The connection is a **transport**, not an authorization bypass. For
 * user-originated work, use `createUnitOfWork(db)` from
 * `@evermora/database/persistence` — its `transaction(caller, …)` establishes
 * the caller's RLS context (`SET LOCAL role` + `request.jwt.claims`), so every
 * statement is RLS-checked. A bare `db.transaction(...)` / `db.execute(...)`
 * runs with no RLS context and must not be used for a signed-in user's writes.
 * Never import this into client/browser code.
 *
 * Schema authority is the SQL under `supabase/migrations/`. Table defs live in
 * `../schema/tables.ts` (hand-written, minimal — the tables in use). `db:pull`
 * full introspection output stays local/git-ignored (see README in this dir).
 */
export function createDrizzleClient(connectionString: string, options?: { max?: number }) {
  const client = postgres(connectionString, { max: options?.max ?? 10, prepare: false });
  return drizzle({ client, casing: "snake_case" });
}
