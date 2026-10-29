/**
 * Integration tests for the core-memorial domain operations against a real local
 * Supabase / PostgreSQL, exercising `createUnitOfWork` + the Drizzle
 * repositories + transaction-scoped RLS.
 *
 * Gated on `DATABASE_URL` (set by the CI `database` job and by devs running
 * `DATABASE_URL=... npm run test:integration` after `supabase db reset`).
 * Skipped in the DB-less quality-gates job.
 *
 * Complements — does NOT replace — the pgTAP RLS suite (`supabase/tests/`).
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  changeMemorialSlug,
  createMemorial,
  DomainEventBuffer,
  publishMemorial,
  saveStorySection,
  systemClock,
  fixedIdGenerator,
  type CallerContext,
  type OperationDeps,
} from "@evermora/domain";
import { createDrizzleClient } from "../drizzle/client";
import { uuidIdGenerator } from "./generators";
import { createUnitOfWork } from "./unit-of-work";

const DB_URL = process.env.DATABASE_URL;
const run = DB_URL ? describe : describe.skip;

// Seeded fixtures (supabase/seed.sql)
const OWNER = "a0000000-0000-4000-a000-000000000001";
const STRANGER = "a0000000-0000-4000-a000-000000000004";

// Unique per test-run so re-runs and parallel workers never collide.
const RUN = `it${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (name: string) => `${RUN}-${name}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("core-memorial operations (integration)", () => {
  const admin = postgres(DB_URL!, { max: 2, prepare: false });
  const db = createDrizzleClient(DB_URL!, { max: 4 });
  const uow = createUnitOfWork(db);

  function deps(ids?: string[]): OperationDeps {
    return {
      unitOfWork: uow,
      clock: systemClock,
      ids: ids ? fixedIdGenerator(ids) : uuidIdGenerator,
      events: new DomainEventBuffer(),
    };
  }

  async function cleanup() {
    await admin`delete from audit_logs where memorial_id in (
      select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
    await admin`delete from memorials where id in (
      select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
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

  it("createMemorial persists memorial + owner membership + settings + slug + audit", async () => {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Integration Person One", slug: slug("person-one") },
      deps: deps(),
    });

    const m = await admin<
      { status: string; created_by: string; funeral_planning_status: string }[]
    >`select status, created_by, funeral_planning_status from memorials where id = ${res.memorialId}`;
    expect(m[0]).toMatchObject({
      status: "draft",
      created_by: OWNER,
      funeral_planning_status: "not_started",
    });

    const mem =
      await admin`select role, status from memorial_memberships where memorial_id = ${res.memorialId}`;
    expect(mem[0]).toMatchObject({ role: "owner", status: "active" });

    const priv =
      await admin`select visibility, search_indexing_enabled from privacy_settings where memorial_id = ${res.memorialId}`;
    expect(priv[0]).toMatchObject({ visibility: "private", search_indexing_enabled: false });

    const feat =
      await admin`select tributes_enabled, photo_contributions_enabled from feature_settings where memorial_id = ${res.memorialId}`;
    expect(feat[0]).toMatchObject({ tributes_enabled: true, photo_contributions_enabled: false });

    const sl =
      await admin`select slug, is_canonical from memorial_slugs where memorial_id = ${res.memorialId}`;
    expect(sl[0]).toMatchObject({ slug: slug("person-one"), is_canonical: true });

    const audit = await admin`select action from audit_logs where memorial_id = ${res.memorialId}`;
    expect(audit.map((a) => a.action)).toContain("memorial.created");
  });

  it("createMemorial maps a taken slug to a conflict and writes nothing (race-safe)", async () => {
    await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Dup One", slug: slug("dup") },
      deps: deps(),
    });

    await expect(
      createMemorial({
        caller: caller(OWNER),
        input: { fullName: "Dup Two", slug: slug("dup") },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "slug_unavailable" } });

    const rows = await admin<
      { n: number }[]
    >`select count(*)::int n from memorials where full_name = 'Dup Two'`;
    expect(rows[0]?.n).toBe(0);
  });

  it("createMemorial rejects a reserved slug (DB registry backs the check)", async () => {
    await expect(
      createMemorial({
        caller: caller(OWNER),
        input: { fullName: "Admin Wannabe", slug: "admin" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "slug_reserved" } });
  });

  it("RLS: an unrelated authenticated caller can neither see nor publish the draft", async () => {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Private Draft", slug: slug("private-draft") },
      deps: deps(),
    });

    await expect(
      publishMemorial({
        caller: caller(STRANGER),
        input: { memorialId: res.memorialId },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    const m = await admin`select status from memorials where id = ${res.memorialId}`;
    expect(m[0]?.status).toBe("draft");
  });

  it("publishMemorial requires minimum content, then transitions draft → published; funeral status unchanged", async () => {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Publish Me", slug: slug("publish-me") },
      deps: deps(),
    });

    // Empty draft cannot publish.
    await expect(
      publishMemorial({
        caller: caller(OWNER),
        input: { memorialId: res.memorialId },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ details: { reason: "missing_minimum_content" } });

    await saveStorySection({
      caller: caller(OWNER),
      input: {
        memorialId: res.memorialId,
        title: "Her life",
        body: "A teacher for forty years.",
        status: "published",
      },
      deps: deps(),
    });

    const pub = await publishMemorial({
      caller: caller(OWNER),
      input: { memorialId: res.memorialId },
      deps: deps(),
    });
    expect(pub.status).toBe("published");
    expect(pub.canonicalSlug).toBe(slug("publish-me"));

    const m =
      await admin`select status, published_at, funeral_planning_status from memorials where id = ${res.memorialId}`;
    expect(m[0]?.status).toBe("published");
    expect(m[0]?.published_at).not.toBeNull();
    expect(m[0]?.funeral_planning_status).toBe("not_started");

    await expect(
      publishMemorial({
        caller: caller(OWNER),
        input: { memorialId: res.memorialId },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("changeMemorialSlug retires the old slug, promotes the new, keeps one canonical, alias still resolves", async () => {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Rename Me", slug: slug("old-name") },
      deps: deps(),
    });

    const changed = await changeMemorialSlug({
      caller: caller(OWNER),
      input: { memorialId: res.memorialId, newSlug: `${RUN} New Name` },
      deps: deps(),
    });
    expect(changed.canonicalSlug).toBe(`${RUN.toLowerCase()}-new-name`);
    expect(changed.previousCanonicalSlug).toBe(slug("old-name"));

    const rows = await admin<{ slug: string; is_canonical: boolean; retired_at: string | null }[]>`
      select slug, is_canonical, retired_at from memorial_slugs where memorial_id = ${res.memorialId}`;
    expect(rows.filter((r) => r.is_canonical)).toHaveLength(1);
    expect(rows.find((r) => r.is_canonical)?.slug).toBe(`${RUN.toLowerCase()}-new-name`);
    const old = rows.find((r) => r.slug === slug("old-name"));
    expect(old?.is_canonical).toBe(false);
    expect(old?.retired_at).not.toBeNull();

    const resolved = await admin<{ canonical_slug: string; is_alias: boolean }[]>`
      select * from resolve_memorial_slug(${slug("old-name")})`;
    expect(resolved[0]?.canonical_slug).toBe(`${RUN.toLowerCase()}-new-name`);
    expect(resolved[0]?.is_alias).toBe(true);

    const audit = await admin<{ metadata: Record<string, unknown> }[]>`
      select metadata from audit_logs where memorial_id = ${res.memorialId} and action = 'memorial.slug_changed'`;
    expect(audit[0]?.metadata).toMatchObject({
      from: slug("old-name"),
      to: `${RUN.toLowerCase()}-new-name`,
    });
  });

  it("changeMemorialSlug rejects a slug owned by another memorial", async () => {
    const a = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Owner A", slug: slug("owns-a") },
      deps: deps(),
    });
    const b = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Owner B", slug: slug("owns-b") },
      deps: deps(),
    });
    void a;

    await expect(
      changeMemorialSlug({
        caller: caller(OWNER),
        input: { memorialId: b.memorialId, newSlug: slug("owns-a") },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "slug_unavailable" } });
  });

  it("transaction rollback: a slug conflict after the memorial insert leaves nothing behind", async () => {
    await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Rollback Seed", slug: slug("rollback") },
      deps: deps(),
    });

    await expect(
      createMemorial({
        caller: caller(OWNER),
        input: { fullName: "Rollback Victim", slug: slug("rollback") },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "conflict" });

    const rows = await admin<
      { n: number }[]
    >`select count(*)::int n from memorials where full_name = 'Rollback Victim'`;
    expect(rows[0]?.n).toBe(0);
  });
});
