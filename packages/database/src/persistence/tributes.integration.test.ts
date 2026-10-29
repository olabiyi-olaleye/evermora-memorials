/**
 * Integration tests for the Phase 5G tribute operations against a real local
 * Supabase / PostgreSQL — the RLS auto-approve path, the SECURITY DEFINER
 * rate-limit helper, and moderation transitions.
 *
 * Gated on `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  approveTribute,
  createMemorial,
  DomainEventBuffer,
  reportTribute,
  submitTribute,
  systemClock,
  updateMemorialFeatures,
  type CallerContext,
  type OperationDeps,
} from "@evermora/domain";
import { createDrizzleClient } from "../drizzle/client";
import { uuidIdGenerator } from "./generators";
import { createUnitOfWork } from "./unit-of-work";

const DB_URL = process.env.DATABASE_URL;
const run = DB_URL ? describe : describe.skip;

const OWNER = "a0000000-0000-4000-a000-000000000001";
const MODERATOR = "a0000000-0000-4000-a000-000000000003";

const RUN = `tr${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (n: string) => `${RUN}-${n}`;

function caller(userId: string | null, ip?: string): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
    request: ip ? { ip } : undefined,
  };
}

run("tribute operations (integration)", () => {
  const admin = postgres(DB_URL!, { max: 2, prepare: false });
  const db = createDrizzleClient(DB_URL!, { max: 4 });
  const uow = createUnitOfWork(db);
  const deps = (): OperationDeps => ({
    unitOfWork: uow,
    clock: systemClock,
    ids: uuidIdGenerator,
    events: new DomainEventBuffer(),
  });

  async function seedPublished(n: string): Promise<string> {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Tribute ${n}`, slug: slug(n) },
      deps: deps(),
    });
    // publish so anon can read it + submit
    await admin`update memorials set status = 'published', published_at = now() where id = ${res.memorialId}`;
    await admin`update privacy_settings set visibility = 'public' where memorial_id = ${res.memorialId}`;
    // grant the moderator role
    await admin`insert into memorial_memberships (id, memorial_id, profile_id, role, status, invited_by)
      values (${randomUUID()}, ${res.memorialId}, ${MODERATOR}, 'tribute_moderator', 'active', ${OWNER})`;
    return res.memorialId;
  }

  async function cleanup() {
    await admin`delete from reports where memorial_id in (select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
    await admin`delete from audit_logs where memorial_id in (select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
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

  it("anon submits a pending tribute; a moderator approves it → public", async () => {
    const id = await seedPublished("moderated");
    const submitted = await submitTribute({
      caller: caller(null, "203.0.113.55"),
      input: { memorialId: id, authorDisplayName: "Grace", message: "She taught me to read." },
      deps: deps(),
    });
    expect(submitted.status).toBe("pending");

    const row =
      await admin`select status, published_at from tributes where id = ${submitted.tributeId}`;
    expect(row[0]).toMatchObject({ status: "pending" });
    expect(row[0]?.published_at).toBeNull();

    // Not yet in the public projection.
    const pub1 = await admin`select count(*)::int n from public_tributes where memorial_id = ${id}`;
    expect(pub1[0]?.n).toBe(0);

    await approveTribute({
      caller: caller(MODERATOR),
      input: { memorialId: id, tributeId: submitted.tributeId! },
      deps: deps(),
    });
    const pub2 = await admin`select count(*)::int n from public_tributes where memorial_id = ${id}`;
    expect(pub2[0]?.n).toBe(1);
  });

  it("auto-approves when moderation is disabled (§37) — RLS allows the approved insert", async () => {
    const id = await seedPublished("auto");
    await updateMemorialFeatures({
      caller: caller(OWNER),
      input: { memorialId: id, tributeModerationEnabled: false },
      deps: deps(),
    });
    const res = await submitTribute({
      caller: caller(null, "203.0.113.56"),
      input: { memorialId: id, authorDisplayName: "Chidi", message: "A wonderful woman." },
      deps: deps(),
    });
    expect(res.status).toBe("approved");
    const pub = await admin`select count(*)::int n from public_tributes where memorial_id = ${id}`;
    expect(pub[0]?.n).toBe(1);
  });

  it("the per-IP rate limit works for anonymous submitters", async () => {
    const id = await seedPublished("rate");
    for (let i = 0; i < 3; i++) {
      await submitTribute({
        caller: caller(null, "198.51.100.42"),
        input: { memorialId: id, authorDisplayName: `P${i}`, message: `m${i}` },
        deps: deps(),
      });
    }
    await expect(
      submitTribute({
        caller: caller(null, "198.51.100.42"),
        input: { memorialId: id, authorDisplayName: "P4", message: "one more" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("a private/unpublished memorial reads as not_found for an anon submitter", async () => {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Draft Tribute Target", slug: slug("draft") },
      deps: deps(),
    });
    await expect(
      submitTribute({
        caller: caller(null, "203.0.113.99"),
        input: { memorialId: res.memorialId, authorDisplayName: "X", message: "y" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("reportTribute writes an open report", async () => {
    const id = await seedPublished("report");
    const t = await submitTribute({
      caller: caller(null, "203.0.113.60"),
      input: { memorialId: id, authorDisplayName: "Grace", message: "hi" },
      deps: deps(),
    });
    const r = await reportTribute({
      caller: caller(null, "203.0.113.61"),
      input: { memorialId: id, tributeId: t.tributeId!, reason: "spam" },
      deps: deps(),
    });
    const row = await admin`select status, reason from reports where id = ${r.reportId}`;
    expect(row[0]).toMatchObject({ status: "open", reason: "spam" });
  });

  it("reportTribute rate-limits repeated reports from the same IP via the SECURITY DEFINER count (Phase 5O)", async () => {
    const id = await seedPublished("report-rl");
    const t = await submitTribute({
      caller: caller(null, "203.0.113.70"),
      input: { memorialId: id, authorDisplayName: "Grace", message: "hi" },
      deps: deps(),
    });
    const ip = "203.0.113." + (100 + Math.floor(Math.random() * 100));
    for (let i = 0; i < 10; i++) {
      await reportTribute({
        caller: caller(null, ip),
        input: { memorialId: id, tributeId: t.tributeId!, reason: "spam" },
        deps: deps(),
      });
    }
    await expect(
      reportTribute({
        caller: caller(null, ip),
        input: { memorialId: id, tributeId: t.tributeId!, reason: "spam" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });
});
