import type { MemorialId, MemorialRole, ProfileId } from "@evermora/types";
import { fixedClock } from "../clock";
import type { CallerContext } from "../context";
import { DomainEventBuffer } from "../events";
import { fixedIdGenerator } from "../id-generator";
import type { OperationDeps } from "../operations/deps";
import { createInMemoryDb, type InMemoryDb } from "./in-memory";

export function caller(
  userId: string | null,
  opts: { isPlatformAdmin?: boolean; roles?: Record<string, MemorialRole> } = {},
): CallerContext {
  const roles = new Map<MemorialId, MemorialRole>();
  for (const [k, v] of Object.entries(opts.roles ?? {})) roles.set(k as MemorialId, v);
  return {
    userId: (userId as ProfileId | null) ?? null,
    isPlatformAdmin: opts.isPlatformAdmin ?? false,
    memorialRoles: roles,
  };
}

export const ANON: CallerContext = caller(null);

export interface Harness {
  db: InMemoryDb;
  deps: OperationDeps;
  events: DomainEventBuffer;
}

export function harness(opts: { ids?: string[]; at?: string } = {}): Harness {
  const db = createInMemoryDb();
  const events = new DomainEventBuffer();
  const deps: OperationDeps = {
    unitOfWork: db.unitOfWork,
    clock: fixedClock(opts.at ?? "2026-09-02T12:00:00.000Z"),
    ids: fixedIdGenerator(
      opts.ids ?? [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ],
    ),
    events,
  };
  return { db, deps, events };
}
