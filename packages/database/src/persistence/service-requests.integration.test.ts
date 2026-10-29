/**
 * Integration tests for the Phase 5L `requestFuneralService` operation against a
 * real local Supabase / PostgreSQL, including the anon RLS insert path and the
 * `my_service_requests` requester projection. Gated on `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMemorial,
  DomainEventBuffer,
  requestFuneralService,
  systemClock,
  type CallerContext,
  type OperationDeps,
} from "@evermora/domain";
import { createDrizzleClient } from "../drizzle/client";
import { uuidIdGenerator } from "./generators";
import { createUnitOfWork } from "./unit-of-work";

const DB_URL = process.env.DATABASE_URL;
const run = DB_URL ? describe : describe.skip;

const OWNER = "a0000000-0000-4000-a000-000000000001";
const RUN = `sv${randomUUID().replace(/-/g, "").slice(0, 10)}`;

function caller(userId: string | null, ip?: string): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
    request: ip ? { ip } : undefined,
  };
}

run("service-request operations (integration)", () => {
  const admin = postgres(DB_URL!, { max: 2, prepare: false });
  const db = createDrizzleClient(DB_URL!, { max: 4 });
  const uow = createUnitOfWork(db);
  const deps = (): OperationDeps => ({
    unitOfWork: uow,
    clock: systemClock,
    ids: uuidIdGenerator,
    events: new DomainEventBuffer(),
  });

  async function cleanup() {
    await admin`delete from service_requests where contact_email like ${RUN + "%"}`;
    await admin`delete from audit_logs where action = 'service_request.created' and metadata->>'serviceType' = ${RUN}`;
    await admin`delete from memorials where id in (select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
  }

  beforeAll(async () => {
    const rows = await admin<
      { n: number }[]
    >`select count(*)::int n from profiles where id = ${OWNER}`;
    if (rows[0]?.n !== 1) throw new Error("dev seed not loaded — run `supabase db reset` first");
    await cleanup();
  });
  afterAll(async () => {
    await cleanup();
    await db.$client.end();
    await admin.end();
  });

  it("an anonymous visitor inserts a `new`, unassigned enquiry", async () => {
    const res = await requestFuneralService({
      caller: caller(null),
      input: {
        contactName: "A Visitor",
        contactEmail: `${RUN}anon@example.test`,
        serviceType: "printing",
        details: "120 programmes",
      },
      deps: deps(),
    });
    const rows = await admin<
      { status: string; assigned_to: string | null; internal_notes: string | null }[]
    >`select status, assigned_to, internal_notes from service_requests where id = ${res.serviceRequestId}`;
    expect(rows[0]).toMatchObject({ status: "new", assigned_to: null, internal_notes: null });
  });

  it("a signed-in family member's request is attached + visible via my_service_requests", async () => {
    const seed = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Service ${RUN}`, slug: `${RUN}-m` },
      deps: deps(),
    });
    const res = await requestFuneralService({
      caller: caller(OWNER),
      input: {
        memorialId: seed.memorialId,
        contactName: "Ada",
        contactEmail: `${RUN}ada@example.test`,
        serviceType: "livestream",
      },
      deps: deps(),
    });

    const row = await admin<
      { memorial_id: string; requested_by: string }[]
    >`select memorial_id, requested_by from service_requests where id = ${res.serviceRequestId}`;
    expect(row[0]).toMatchObject({ memorial_id: seed.memorialId, requested_by: OWNER });

    // The requester sees it through the view (without internal columns).
    const view = await admin.begin(async (sql) => {
      await sql`select set_config('role','authenticated',true)`;
      await sql`select set_config('request.jwt.claims', ${JSON.stringify({
        sub: OWNER,
        role: "authenticated",
      })}, true)`;
      return sql`select id, service_type from my_service_requests where id = ${res.serviceRequestId}`;
    });
    expect(view).toHaveLength(1);
    expect((view as unknown as { service_type: string }[])[0]?.service_type).toBe("livestream");
  });

  it("rate-limits repeated enquiries from the same IP via the SECURITY DEFINER count (Phase 5O)", async () => {
    const ip = "203.0.113." + (30 + Math.floor(Math.random() * 200));
    for (let i = 0; i < 5; i++) {
      await requestFuneralService({
        caller: caller(null, ip),
        input: { contactName: `V${i}`, contactEmail: `${RUN}rl${i}@example.test` },
        deps: deps(),
      });
    }
    await expect(
      requestFuneralService({
        caller: caller(null, ip),
        input: { contactName: "One more", contactEmail: `${RUN}rlx@example.test` },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });
});
