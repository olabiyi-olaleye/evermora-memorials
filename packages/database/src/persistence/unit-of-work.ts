import type { CallerContext, UnitOfWork } from "@evermora/domain";
import type { EvermoraDb } from "../drizzle/client";
import { buildRepositories } from "./repositories";
import { establishRlsContext } from "./rls-context";

/**
 * The production `UnitOfWork` — one DB transaction per domain operation, with
 * RLS established for the caller (see `rls-context.ts`). Repositories handed to
 * `work` are scoped to that transaction; a thrown error rolls everything back.
 *
 * `db` must be a `createDrizzleClient(...)` instance connecting with the direct
 * `DATABASE_URL`. That connection is a transport, not an authorization bypass:
 * every statement inside `transaction` runs as `authenticated` / `anon` with
 * the caller's JWT claims, so RLS applies.
 */
export function createUnitOfWork(db: EvermoraDb): UnitOfWork {
  return {
    async transaction<T>(
      caller: CallerContext,
      work: (repos: ReturnType<typeof buildRepositories>) => Promise<T>,
    ): Promise<T> {
      return db.transaction(async (tx) => {
        const rls = await establishRlsContext(tx, caller);
        const repos = buildRepositories(tx, rls);
        return work(repos);
      });
    },
  };
}
