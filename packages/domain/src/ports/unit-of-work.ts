import type { CallerContext } from "../context";
import type { Repositories } from "./repositories";

/**
 * The transactional boundary for a domain operation.
 *
 * `transaction(caller, work)` opens one database transaction, **establishes the
 * RLS context that matches `caller`** (so every statement inside is subject to
 * Row Level Security exactly as a PostgREST request would be), and hands `work`
 * a set of repositories scoped to that transaction. Everything commits or rolls
 * back together; a thrown error rolls back.
 *
 * See `docs/architecture/rls-architecture.md` and the RLS/Drizzle decision in
 * `docs/architecture/supabase-environment.md`.
 */
export interface UnitOfWork {
  transaction<T>(caller: CallerContext, work: (repos: Repositories) => Promise<T>): Promise<T>;
}

/** Raised by the adapter for a unique-constraint violation; operations translate it. */
export class UniqueViolation extends Error {
  constructor(
    readonly constraint: string | undefined,
    message = "unique constraint violated",
  ) {
    super(message);
    this.name = "UniqueViolation";
  }
}

export function isUniqueViolation(value: unknown): value is UniqueViolation {
  return value instanceof UniqueViolation;
}
