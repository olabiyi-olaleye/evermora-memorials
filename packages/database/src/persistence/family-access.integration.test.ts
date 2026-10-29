/**
 * Integration tests for the Phase 5K family-access operations against a real
 * local Supabase / PostgreSQL, plus the `accept_memorial_invite` RPC. Gated on
 * `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  changeMemorialRole,
  createMemorial,
  DomainEventBuffer,
  inviteMemorialAdmin,
  systemClock,
  transferMemorialOwnership,
  type CallerContext,
  type OperationDeps,
} from "@evermora/domain";
import { createDrizzleClient } from "../drizzle/client";
import { uuidIdGenerator } from "./generators";
import { createUnitOfWork } from "./unit-of-work";

const DB_URL = process.env.DATABASE_URL;
const run = DB_URL ? describe : describe.skip;

const OWNER = "a0000000-0000-4000-a000-000000000001";
const HELPER = "a0000000-0000-4000-a000-000000000002"; // seeded profile, email chidi.editor@example.test
const STRANGER = "a0000000-0000-4000-a000-000000000004";

const RUN = `fa${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (n: string) => `${RUN}-${n}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("family-access operations (integration)", () => {
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
      input: { fullName: `Access ${n}`, slug: slug(n) },
      deps: deps(),
    });
    return res.memorialId;
  }

  /** Run `work` inside one transaction with an authenticated JWT (incl. email). */
  async function asUser<T>(
    userId: string,
    email: string,
    work: (sql: typeof admin) => Promise<T> | postgres.PendingQuery<never>,
  ): Promise<T> {
    return admin.begin(async (sql) => {
      await sql`select set_config('role','authenticated',true)`;
      await sql`select set_config('request.jwt.claims', ${JSON.stringify({
        sub: userId,
        role: "authenticated",
        email,
      })}, true)`;
      return work(sql as unknown as typeof admin) as Promise<T>;
    }) as Promise<T>;
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

  it("invites by email, then the invitee accepts via the RPC", async () => {
    const id = await seed("invite");
    const res = await inviteMemorialAdmin({
      caller: caller(OWNER),
      input: { memorialId: id, email: "chidi.editor@example.test", role: "content_editor" },
      deps: deps(),
    });
    expect(res.membership).toMatchObject({ status: "invited", profileId: null });

    // The invitee (HELPER, whose email is chidi.editor@example.test) accepts.
    await asUser(
      HELPER,
      "chidi.editor@example.test",
      (sql) => sql`select * from accept_memorial_invite(${res.membership.id}::uuid)`,
    );
    const row =
      await admin`select profile_id, status from memorial_memberships where id = ${res.membership.id}`;
    expect(row[0]).toMatchObject({ profile_id: HELPER, status: "active" });
  });

  it("a stranger's email cannot accept someone else's invite", async () => {
    const id = await seed("wrong-email");
    const res = await inviteMemorialAdmin({
      caller: caller(OWNER),
      input: { memorialId: id, email: "someone.else@example.test", role: "viewer" },
      deps: deps(),
    });
    await expect(
      asUser(
        HELPER,
        "chidi.editor@example.test",
        (sql) => sql`select * from accept_memorial_invite(${res.membership.id}::uuid)`,
      ),
    ).rejects.toThrow(/not found or not addressed/i);
  });

  it("changes a member's role; RLS: a stranger cannot invite", async () => {
    const id = await seed("role");
    // seed an active member to modify
    const [m] = await admin`
      insert into memorial_memberships (memorial_id, profile_id, role, status, invited_by, accepted_at)
      values (${id}, ${HELPER}, 'viewer', 'active', ${OWNER}, now()) returning id`;

    const up = await changeMemorialRole({
      caller: caller(OWNER),
      input: { memorialId: id, membershipId: m!.id, role: "content_editor" },
      deps: deps(),
    });
    expect(up.membership.role).toBe("content_editor");

    await expect(
      inviteMemorialAdmin({
        caller: caller(STRANGER),
        input: { memorialId: id, email: "z@example.test", role: "viewer" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("transfers ownership atomically; exactly one active owner remains", async () => {
    const id = await seed("transfer");
    await admin`
      insert into memorial_memberships (memorial_id, profile_id, role, status, invited_by, accepted_at)
      values (${id}, ${HELPER}, 'admin', 'active', ${OWNER}, now())`;

    const res = await transferMemorialOwnership({
      caller: caller(OWNER),
      input: { memorialId: id, newOwnerProfileId: HELPER },
      deps: deps(),
    });
    expect(res.previousOwnerProfileId).toBe(OWNER);

    const owners = await admin<{ profile_id: string }[]>`
      select profile_id from memorial_memberships
      where memorial_id = ${id} and role = 'owner' and status = 'active'`;
    expect(owners).toHaveLength(1);
    expect(owners[0]?.profile_id).toBe(HELPER);
    const prev =
      await admin`select role from memorial_memberships where memorial_id = ${id} and profile_id = ${OWNER}`;
    expect(prev[0]?.role).toBe("admin");
  });
});
