/**
 * Integration tests for the Phase 5E story-section and milestone operations
 * against a real local Supabase / PostgreSQL.
 *
 * Gated on `DATABASE_URL`. Complements the pgTAP RLS suite.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMemorial,
  DomainEventBuffer,
  removeMilestone,
  reorderStorySections,
  saveMilestone,
  saveStorySection,
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
const STRANGER = "a0000000-0000-4000-a000-000000000004";

const RUN = `st${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (n: string) => `${RUN}-${n}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("story & milestone operations (integration)", () => {
  const admin = postgres(DB_URL!, { max: 2, prepare: false });
  const db = createDrizzleClient(DB_URL!, { max: 4 });
  const uow = createUnitOfWork(db);
  const deps = (): OperationDeps => ({
    unitOfWork: uow,
    clock: systemClock,
    ids: uuidIdGenerator,
    events: new DomainEventBuffer(),
  });

  async function seed(n: string): Promise<string> {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Story ${n}`, slug: slug(n) },
      deps: deps(),
    });
    return res.memorialId;
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

  it("creates, updates and reorders story sections; audit rows written", async () => {
    const id = await seed("sections");
    const a = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Early life", body: "Born in Enugu." },
      deps: deps(),
    });
    const b = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Career", body: "Taught 40 years.", status: "published" },
      deps: deps(),
    });
    expect(b.section.displayOrder).toBe(1);

    await reorderStorySections({
      caller: caller(OWNER),
      input: { memorialId: id, orderedIds: [b.section.id, a.section.id] },
      deps: deps(),
    });
    const rows = await admin<{ id: string; display_order: number }[]>`
      select id, display_order from story_sections where memorial_id = ${id} and deleted_at is null order by display_order`;
    expect(rows[0]?.id).toBe(b.section.id);

    const audit =
      await admin`select action from audit_logs where memorial_id = ${id} and action like 'story_section.%'`;
    expect(audit.length).toBeGreaterThanOrEqual(2);
  });

  it("RLS: a stranger cannot add a story section", async () => {
    const id = await seed("sections-rls");
    await expect(
      saveStorySection({
        caller: caller(STRANGER),
        input: { memorialId: id, title: "hi", body: "there" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    const rows = await admin<
      { n: number }[]
    >`select count(*)::int n from story_sections where memorial_id = ${id}`;
    expect(rows[0]?.n).toBe(0);
  });

  it("milestones: full date derives the year; soft delete hides the row", async () => {
    const id = await seed("timeline");
    const m = await saveMilestone({
      caller: caller(OWNER),
      input: { memorialId: id, onDate: "1945-03-12", title: "Born" },
      deps: deps(),
    });
    expect(m.milestone.year).toBe(1945);

    await removeMilestone({
      caller: caller(OWNER),
      input: { memorialId: id, id: m.milestone.id },
      deps: deps(),
    });
    const rows = await admin<{ deleted_at: string | null }[]>`
      select deleted_at from milestones where id = ${m.milestone.id}`;
    expect(rows[0]?.deleted_at).not.toBeNull();
  });
});
