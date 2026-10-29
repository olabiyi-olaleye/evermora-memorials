import "server-only";
import { createDrizzleClient } from "@evermora/database/drizzle";
import { createUnitOfWork, uuidIdGenerator } from "@evermora/database/persistence";
import {
  DomainEventBuffer,
  isDomainError,
  systemClock,
  type CallerContext,
  type OperationDeps,
} from "@evermora/domain";
import { serverEnv } from "@/lib/env";

export type ActionError = { code: string; message: string; details?: Record<string, unknown> };
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };

let dbClient: ReturnType<typeof createDrizzleClient> | null = null;
function db() {
  dbClient ??= createDrizzleClient(serverEnv().DATABASE_URL);
  return dbClient;
}

function operationDeps(): OperationDeps {
  return {
    unitOfWork: createUnitOfWork(db()),
    clock: systemClock,
    ids: uuidIdGenerator,
    events: new DomainEventBuffer(),
    // CAPTCHA provider deferred — no verifier wired, so challenges are not enforced.
  };
}

/** An anonymous visitor. Optional best-effort IP for rate limiting / audit. */
export function anonCaller(request?: { ip?: string; userAgent?: string }): CallerContext {
  return { userId: null, isPlatformAdmin: false, memorialRoles: new Map(), request };
}

function toActionError(err: unknown): ActionError {
  if (isDomainError(err)) return { code: err.code, message: err.message, details: err.details };
  return { code: "internal", message: "Something went wrong. Please try again." };
}

/**
 * Runs a domain operation and maps it to a serialisable `ActionResult` — no
 * raw SQL / Postgres / stack detail ever reaches the visitor. Domain events
 * are drained after commit (dispatch is a later phase).
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
