import "server-only";
import { createDrizzleClient } from "@evermora/database/drizzle";
import { createUnitOfWork, uuidIdGenerator } from "@evermora/database/persistence";
import {
  DomainEventBuffer,
  isDomainError,
  systemClock,
  type OperationDeps,
} from "@evermora/domain";
import { serverEnv } from "@/lib/env";
import { toActionError, type ActionError } from "@/lib/caller";

export type { ActionError } from "@/lib/caller";
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

// One Drizzle client per server instance (postgres-js pools connections).
let dbClient: ReturnType<typeof createDrizzleClient> | null = null;
function db() {
  dbClient ??= createDrizzleClient(serverEnv().DATABASE_URL);
  return dbClient;
}

/** Fresh per-call deps (each op gets its own DomainEventBuffer). */
export function operationDeps(): OperationDeps {
  return {
    unitOfWork: createUnitOfWork(db()),
    clock: systemClock,
    ids: uuidIdGenerator,
    events: new DomainEventBuffer(),
  };
}

/**
 * Runs a domain operation and maps the outcome to a serialisable
 * `ActionResult`. Domain errors become `{ ok:false, error:{code,message} }`;
 * anything else is logged server-side and returned as a generic `internal`
 * error — never a raw SQL / Postgres / stack detail to the caller.
 *
 * Domain events are drained after success. There is no external event bus /
 * notification dispatch yet (a later phase); draining keeps the buffer clean.
 */
export async function runOperation<T>(
  fn: (deps: OperationDeps) => Promise<T>,
): Promise<ActionResult<T>> {
  const deps = operationDeps();
  try {
    const data = await fn(deps);
    deps.events.drain();
    return { ok: true, data };
  } catch (err) {
    if (!isDomainError(err)) console.error("[operation error]", err);
    return { ok: false, error: toActionError(err) };
  }
}
