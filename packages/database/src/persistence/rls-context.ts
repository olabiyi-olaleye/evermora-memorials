import { sql } from "drizzle-orm";
import type { CallerContext } from "@evermora/domain";

/**
 * Reproduces PostgREST's request context on a direct `postgres-js` connection.
 *
 * Inside a transaction we `SET LOCAL` the database `role` and
 * `request.jwt.claims` to match the caller, so every subsequent statement is
 * subject to Row Level Security exactly as an anon/authenticated API request
 * would be. `SET LOCAL` reverts automatically when the transaction ends, so a
 * pooled connection never leaks context.
 *
 * This is the Evermora RLS/Drizzle decision: user-originated writes go through
 * the direct connection but **do not bypass RLS** — the direct connection is a
 * transport, not an authorization escape hatch. The service-role key is never
 * used as a general shortcut; `withElevatedRole` is a narrow, explicit
 * escalation for the audit insert only.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any drizzle tx handle with .execute
type Executor = { execute(query: unknown): Promise<any> };

export interface RlsContext {
  /** The base role for this transaction ("authenticated" or "anon"). */
  readonly baseRole: "authenticated" | "anon";
  /** Run `fn` with the role temporarily raised to `service_role`, then restore. */
  withElevatedRole<T>(fn: () => Promise<T>): Promise<T>;
}

export async function establishRlsContext(
  tx: Executor,
  caller: CallerContext,
): Promise<RlsContext> {
  const baseRole: "authenticated" | "anon" = caller.userId ? "authenticated" : "anon";
  const claims = caller.userId
    ? JSON.stringify({ sub: caller.userId, role: "authenticated" })
    : JSON.stringify({ role: "anon" });

  await tx.execute(sql`select set_config('role', ${baseRole}, true)`);
  await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);

  return {
    baseRole,
    async withElevatedRole<T>(fn: () => Promise<T>): Promise<T> {
      await tx.execute(sql`select set_config('role', 'service_role', true)`);
      try {
        return await fn();
      } finally {
        await tx.execute(sql`select set_config('role', ${baseRole}, true)`);
      }
    },
  };
}
