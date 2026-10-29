/**
 * Integration tests for Phase 5N notification recording + the in-app centre
 * against a real local Supabase / PostgreSQL. Gated on `DATABASE_URL`.
 *
 * Covers the elevated INSERT path (`authenticated` has no INSERT on
 * `notifications`), recipient-scoped RLS on read, and `channel='email'` rows
 * recorded for the (separate, unbuilt) delivery worker.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMemorial,
  DomainEventBuffer,
  inviteMemorialAdmin,
  listMyNotifications,
  markNotificationsRead,
  publishFamilyUpdate,
  reportTribute,
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
const MEMBER = "a0000000-0000-4000-a000-000000000002";
const STAFF = "a0000000-0000-4000-a000-0000000000ff";
const RUN = `nt${randomUUID().replace(/-/g, "").slice(0, 10)}`;

function caller(userId: string, isPlatformAdmin = false): CallerContext {
  return { userId: userId as CallerContext["userId"], isPlatformAdmin, memorialRoles: new Map() };
}

run("notifications (integration)", () => {
  const admin = postgres(DB_URL!, { max: 2, prepare: false });
  const db = createDrizzleClient(DB_URL!, { max: 4 });
  const uow = createUnitOfWork(db);
  const deps = (): OperationDeps => ({
    unitOfWork: uow,
    clock: systemClock,
    ids: uuidIdGenerator,
    events: new DomainEventBuffer(),
  });

  const slugs: string[] = [];

  async function cleanup() {
    await admin`delete from notifications where memorial_id in (select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
    await admin`delete from notifications where recipient_email like ${RUN + "%"}`;
    await admin`delete from reports where memorial_id in (select memorial_id from memorial_slugs where slug like ${RUN + "-%"})`;
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

  async function seedMemorial(tag: string): Promise<string> {
    const slug = `${RUN}-${tag}`;
    slugs.push(slug);
    const seed = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Notif ${RUN} ${tag}`, slug },
      deps: deps(),
    });
    await admin`insert into memorial_memberships (memorial_id, profile_id, role, status, accepted_at, invited_by)
      values (${seed.memorialId}, ${MEMBER}, 'content_editor', 'active', now(), ${OWNER})`;
    return seed.memorialId;
  }

  it("records an in-app notification for other members when a family update is published (elevated insert)", async () => {
    const memorialId = await seedMemorial("fu");
    const { update } = await saveFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId, title: "Thank you", body: "We are grateful for your support." },
      deps: deps(),
    });
    await publishFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId, updateId: update.id },
      deps: deps(),
    });

    const rows = await admin`
      select recipient_profile_id, event_type, channel from notifications
      where memorial_id = ${memorialId} order by recipient_profile_id`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      recipient_profile_id: MEMBER,
      event_type: "family_update_published",
      channel: "in_app",
    });

    // RLS: the member sees it through the in-app centre; the actor does not.
    const asMember = await listMyNotifications({ caller: caller(MEMBER), deps: deps() });
    expect(asMember.unread).toBeGreaterThanOrEqual(1);
    expect(asMember.notifications.some((n) => n.memorialId === memorialId)).toBe(true);

    const asOwner = await listMyNotifications({ caller: caller(OWNER), deps: deps() });
    expect(asOwner.notifications.some((n) => n.memorialId === memorialId)).toBe(false);

    // mark read
    const target = asMember.notifications.find((n) => n.memorialId === memorialId)!;
    await markNotificationsRead({
      caller: caller(MEMBER),
      input: { ids: [target.id] },
      deps: deps(),
    });
    const [after] = await admin`select read_at from notifications where id = ${target.id}`;
    expect(after!.read_at).not.toBeNull();
  });

  it("notifies platform staff when a tribute is reported", async () => {
    const memorialId = await seedMemorial("rp");
    const [tribute] = await admin`
      insert into tributes (memorial_id, status, author_display_name, message)
      values (${memorialId}, 'pending', 'Anon', 'A message.') returning id`;
    await reportTribute({
      caller: caller(MEMBER),
      input: { memorialId, tributeId: tribute!.id, reason: "abuse" },
      deps: deps(),
    });
    const rows = await admin`
      select recipient_profile_id, event_type from notifications
      where memorial_id = ${memorialId} and event_type = 'memorial_reported'`;
    expect(rows.map((r) => r.recipient_profile_id)).toContain(STAFF);
  });

  it("records an email-channel notification for a pre-account invitee (not shown in-app)", async () => {
    const memorialId = await seedMemorial("iv");
    const email = `${RUN}-invitee@example.test`;
    await inviteMemorialAdmin({
      caller: caller(OWNER),
      input: { memorialId, email, role: "content_editor" },
      deps: deps(),
    });
    const rows = await admin`
      select recipient_email, channel, event_type from notifications where recipient_email = ${email}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ channel: "email", event_type: "admin_invited" });
  });
});
