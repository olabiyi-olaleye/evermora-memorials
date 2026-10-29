/**
 * Integration tests for the Phase 5M platform-moderation operations against a
 * real local Supabase / PostgreSQL. Gated on `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMemorial,
  DomainEventBuffer,
  resolveReport,
  setMemorialModeration,
  systemClock,
  updateServiceRequest,
  type CallerContext,
  type OperationDeps,
} from "@evermora/domain";
import { createDrizzleClient } from "../drizzle/client";
import { uuidIdGenerator } from "./generators";
import { createUnitOfWork } from "./unit-of-work";

const DB_URL = process.env.DATABASE_URL;
const run = DB_URL ? describe : describe.skip;

const OWNER = "a0000000-0000-4000-a000-000000000001";
const STAFF = "a0000000-0000-4000-a000-0000000000ff";
const RUN = `pm${randomUUID().replace(/-/g, "").slice(0, 10)}`;

function caller(userId: string, isPlatformAdmin = false): CallerContext {
  return { userId: userId as CallerContext["userId"], isPlatformAdmin, memorialRoles: new Map() };
}

run("platform-moderation operations (integration)", () => {
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
    await admin`delete from reports where reporter_email like ${RUN + "%"}`;
    await admin`delete from service_requests where contact_email like ${RUN + "%"}`;
    await admin`delete from audit_logs where memorial_id in (select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
    await admin`delete from memorials where id in (select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
  }

  beforeAll(async () => {
    const rows = await admin<
      { n: number }[]
    >`select count(*)::int n from profiles where id = ${STAFF} and is_platform_admin`;
    if (rows[0]?.n !== 1) throw new Error("dev seed not loaded — run `supabase db reset` first");
    await cleanup();
  });
  afterAll(async () => {
    await cleanup();
    await db.$client.end();
    await admin.end();
  });

  it("staff suspend then restore a published memorial", async () => {
    const seed = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Mod ${RUN}`, slug: `${RUN}-m` },
      deps: deps(),
    });
    await admin`update memorials set status='published', published_at=now() where id = ${seed.memorialId}`;

    await setMemorialModeration({
      caller: caller(STAFF, true),
      input: { memorialId: seed.memorialId, action: "suspend", reason: "Report upheld." },
      deps: deps(),
    });
    const s1 =
      await admin`select status, suspended_reason from memorials where id = ${seed.memorialId}`;
    expect(s1[0]).toMatchObject({ status: "suspended", suspended_reason: "Report upheld." });

    await setMemorialModeration({
      caller: caller(STAFF, true),
      input: { memorialId: seed.memorialId, action: "restore" },
      deps: deps(),
    });
    const s2 =
      await admin`select status, suspended_at from memorials where id = ${seed.memorialId}`;
    expect(s2[0]).toMatchObject({ status: "published", suspended_at: null });
  });

  it("a non-staff caller cannot suspend (domain + RLS)", async () => {
    const seed = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Mod2 ${RUN}`, slug: `${RUN}-m2` },
      deps: deps(),
    });
    await expect(
      setMemorialModeration({
        caller: caller(OWNER),
        input: { memorialId: seed.memorialId, action: "suspend" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("staff resolve a report and update a service request", async () => {
    const [rep] = await admin`
      insert into reports (memorial_id, reason, details, reporter_email, status)
      values ('e1000000-0000-4000-a000-000000000001', 'spam', 'x', ${RUN + "@example.test"}, 'open')
      returning id`;
    const res = await resolveReport({
      caller: caller(STAFF, true),
      input: { reportId: rep!.id, status: "actioned", note: "Removed." },
      deps: deps(),
    });
    expect(res.report).toMatchObject({ status: "actioned", resolvedBy: STAFF });

    const [sr] = await admin`
      insert into service_requests (contact_name, contact_email, service_type, status)
      values ('Grace', ${RUN + "sr@example.test"}, 'printing', 'new') returning id`;
    const upd = await updateServiceRequest({
      caller: caller(STAFF, true),
      input: { requestId: sr!.id, status: "in_review", assignToMe: true, internalNote: "Called." },
      deps: deps(),
    });
    expect(upd.request).toMatchObject({ status: "in_review", assignedTo: STAFF });
  });
});
