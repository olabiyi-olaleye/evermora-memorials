/**
 * Integration tests for the Phase 5J share-asset operations against a real
 * local Supabase / PostgreSQL, plus the `resolve_share_token` RPC. Gated on
 * `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMemorial,
  DomainEventBuffer,
  generateShareAsset,
  retireShareAsset,
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

const RUN = `sh${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (n: string) => `${RUN}-${n}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("share-asset operations (integration)", () => {
  const admin = postgres(DB_URL!, { max: 2, prepare: false });
  const db = createDrizzleClient(DB_URL!, { max: 4 });
  const uow = createUnitOfWork(db);
  const deps = (): OperationDeps => ({
    unitOfWork: uow,
    clock: systemClock,
    ids: uuidIdGenerator,
    events: new DomainEventBuffer(),
  });

  async function seed(n: string): Promise<{ id: string; canonical: string }> {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Share ${n}`, slug: slug(n) },
      deps: deps(),
    });
    // publish so the resolver's canonical slug is meaningful
    await admin`update memorials set status = 'published', published_at = now() where id = ${res.memorialId}`;
    await admin`update privacy_settings set visibility = 'public' where memorial_id = ${res.memorialId}`;
    return { id: res.memorialId, canonical: slug(n) };
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

  it("mints a resolver; resolve_share_token maps the token to the canonical slug", async () => {
    const { id, canonical } = await seed("mint");
    const res = await generateShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id, label: "Programme", medium: "funeral_programme" },
      deps: deps(),
    });
    expect(res.shareResolver.token).toMatch(/^[a-f0-9]{18}$/);

    const resolved = await admin<
      { memorial_id: string; canonical_slug: string; is_active: boolean }[]
    >`select * from resolve_share_token(${res.shareResolver.token})`;
    expect(resolved[0]).toMatchObject({
      memorial_id: id,
      canonical_slug: canonical,
      is_active: true,
    });

    await retireShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id, shareResolverId: res.shareResolver.id },
      deps: deps(),
    });
    const after = await admin<
      { is_active: boolean }[]
    >`select is_active from resolve_share_token(${res.shareResolver.token})`;
    expect(after[0]?.is_active).toBe(false); // still resolves, marked inactive
  });

  it("RLS: a stranger cannot mint a resolver", async () => {
    const { id } = await seed("rls");
    // The memorial is published + public, so a non-member can *see* it but not edit it.
    await expect(
      generateShareAsset({ caller: caller(STRANGER), input: { memorialId: id }, deps: deps() }),
    ).rejects.toMatchObject({ code: "forbidden" });
    const n = await admin<
      { n: number }[]
    >`select count(*)::int n from share_resolvers where memorial_id = ${id}`;
    expect(n[0]?.n).toBe(0);
  });
});
