/**
 * Integration tests for the Phase 5I family-update operations against a real
 * local Supabase / PostgreSQL. Gated on `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  archiveFamilyUpdate,
  createMemorial,
  DomainEventBuffer,
  publishFamilyUpdate,
  saveFamilyUpdate,
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
const STRANGER = "a0000000-0000-4000-a000-000000000004"; // real auth user, not a member

const RUN = `fu${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (n: string) => `${RUN}-${n}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("family-update operations (integration)", () => {
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
      input: { fullName: `Update ${n}`, slug: slug(n) },
      deps: deps(),
    });
    return res.memorialId;
  }

  async function cleanup() {
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

  it("creates, publishes, archives and re-publishes an update", async () => {
    const id = await seed("lifecycle");
    const created = await saveFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Thank you", body: "We are grateful.", importance: "high" },
      deps: deps(),
    });
    expect(created.update.status).toBe("draft");

    await publishFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId: created.update.id },
      deps: deps(),
    });
    const pub =
      await admin`select status, published_at from family_updates where id = ${created.update.id}`;
    expect(pub[0]).toMatchObject({ status: "published" });
    expect(pub[0]?.published_at).not.toBeNull();
    const stamp = pub[0]?.published_at;

    await archiveFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId: created.update.id },
      deps: deps(),
    });
    const arch = await admin`select status from family_updates where id = ${created.update.id}`;
    expect(arch[0]?.status).toBe("archived");

    await publishFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId: created.update.id },
      deps: deps(),
    });
    const re =
      await admin`select status, published_at from family_updates where id = ${created.update.id}`;
    expect(re[0]).toMatchObject({ status: "published" });
    expect(re[0]?.published_at).toEqual(stamp);
  });

  it("RLS: a stranger cannot post a family update", async () => {
    const id = await seed("rls");
    await expect(
      saveFamilyUpdate({
        caller: caller(STRANGER),
        input: { memorialId: id, title: "sneaky", body: "nope" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    const n = await admin<
      { n: number }[]
    >`select count(*)::int n from family_updates where memorial_id = ${id}`;
    expect(n[0]?.n).toBe(0);
  });
});
