import { UniqueViolation } from "@evermora/domain";

/**
 * postgres-js surfaces the raw Postgres error with `.code` (SQLSTATE) and
 * `.constraint_name`; drizzle wraps that in a query error whose `.cause` is the
 * PG error. Translate the ones the domain needs to reason about into
 * driver-independent domain-port errors; never let a raw PG error / SQL / stack
 * reach a domain operation or a caller.
 */

interface PgLikeError {
  code?: string;
  constraint_name?: string;
  cause?: unknown;
}

function findPgError(err: unknown, depth = 0): PgLikeError | null {
  if (depth > 5 || !err || typeof err !== "object") return null;
  const e = err as PgLikeError;
  if (typeof e.code === "string" && /^\d{5}$/.test(e.code)) return e;
  return findPgError(e.cause, depth + 1);
}

/** Rethrow as a domain `UniqueViolation` on SQLSTATE 23505; otherwise rethrow as-is. */
export function translatePgError(err: unknown): never {
  const pg = findPgError(err);
  if (pg?.code === "23505") {
    throw new UniqueViolation(pg.constraint_name, "unique constraint violated");
  }
  throw err;
}
