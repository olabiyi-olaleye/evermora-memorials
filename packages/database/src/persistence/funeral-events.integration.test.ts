/**
 * Integration tests for the Phase 5H funeral-event operations against a real
 * local Supabase / PostgreSQL. Gated on `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cancelFuneralEvent,
  createMemorial,
  DomainEventBuffer,
  publishFuneralEvent,
  saveFuneralEvent,
  setFuneralPlanningStatus,
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
const STRANGER = "a0000000-0000-4000-a000-000000000004"; // real auth user, not a member of test memorials

const RUN = `fn${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (n: string) => `${RUN}-${n}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("funeral-event operations (integration)", () => {
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
      input: { fullName: `Funeral ${n}`, slug: slug(n) },
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

  it("creates, publishes and cancels an event; lat/long round-trip as numbers", async () => {
    const id = await seed("lifecycle");
    const created = await saveFuneralEvent({
      caller: caller(OWNER),
      input: {
        memorialId: id,
        eventType: "burial",
        title: "Interment",
        eventDate: "2026-08-15",
        startTime: "12:00",
        venueName: "Enugu Municipal Cemetery",
        city: "Enugu",
        latitude: 6.4512,
        longitude: 7.5123,
      },
      deps: deps(),
    });
    expect(created.event.latitude).toBeCloseTo(6.4512, 3);

    const row =
      await admin`select status, latitude from funeral_events where id = ${created.event.id}`;
    expect(row[0]?.status).toBe("draft");

    await publishFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId: created.event.id },
      deps: deps(),
    });
    const pub =
      await admin`select status, published_at from funeral_events where id = ${created.event.id}`;
    expect(pub[0]).toMatchObject({ status: "published" });
    expect(pub[0]?.published_at).not.toBeNull();

    await cancelFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId: created.event.id, reason: "Weather" },
      deps: deps(),
    });
    const canc =
      await admin`select status, cancel_reason from funeral_events where id = ${created.event.id}`;
    expect(canc[0]).toMatchObject({ status: "cancelled", cancel_reason: "Weather" });
  });

  it("RSVP contacts round-trip through jsonb; the DB caps the list at five", async () => {
    const id = await seed("contacts");
    const contacts = [
      { name: "Ada Obi", phone: "08030000001" },
      { name: "Tunde Bello", phone: null },
    ];
    const created = await saveFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventType: "burial", title: "Burial", contacts },
      deps: deps(),
    });
    expect(created.event.contacts).toEqual(contacts);
    const row = await admin<
      { contacts: unknown }[]
    >`select contacts from funeral_events where id = ${created.event.id}`;
    expect(row[0]?.contacts).toEqual(contacts);

    const six = JSON.stringify(Array.from({ length: 6 }, (_, i) => ({ name: `C${i}` })));
    await expect(
      admin`update funeral_events set contacts = ${six}::jsonb where id = ${created.event.id}`,
    ).rejects.toThrow(/funeral_events_contacts_shape/);
  });

  it("RLS: a stranger cannot add a funeral event", async () => {
    const id = await seed("rls");
    await expect(
      saveFuneralEvent({
        caller: caller(STRANGER),
        input: { memorialId: id, title: "sneaky" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    const n = await admin<
      { n: number }[]
    >`select count(*)::int n from funeral_events where memorial_id = ${id}`;
    expect(n[0]?.n).toBe(0);
  });

  it("setFuneralPlanningStatus writes memorials.funeral_planning_status", async () => {
    const id = await seed("planning");
    await setFuneralPlanningStatus({
      caller: caller(OWNER),
      input: { memorialId: id, status: "confirmed" },
      deps: deps(),
    });
    const row = await admin`select status, funeral_planning_status from memorials where id = ${id}`;
    expect(row[0]).toMatchObject({ status: "draft", funeral_planning_status: "confirmed" });
  });
});
