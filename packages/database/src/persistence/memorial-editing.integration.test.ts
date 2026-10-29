/**
 * Integration tests for the memorial-editing operations (Phase 5C) against a
 * real local Supabase / PostgreSQL: profile edits, privacy, and feature
 * toggles through `createUnitOfWork` + Drizzle repositories + transaction-
 * scoped RLS.
 *
 * Gated on `DATABASE_URL`. Complements the pgTAP RLS suite.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMemorial,
  DomainEventBuffer,
  systemClock,
  updateMemorialFeatures,
  updateMemorialPrivacy,
  updateMemorialProfile,
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

const RUN = `ed${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (name: string) => `${RUN}-${name}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("memorial-editing operations (integration)", () => {
  const admin = postgres(DB_URL!, { max: 2, prepare: false });
  const db = createDrizzleClient(DB_URL!, { max: 4 });
  const uow = createUnitOfWork(db);

  function deps(): OperationDeps {
    return {
      unitOfWork: uow,
      clock: systemClock,
      ids: uuidIdGenerator,
      events: new DomainEventBuffer(),
    };
  }

  async function seed(name: string): Promise<string> {
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: `Edit ${name}`, slug: slug(name) },
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

  it("updateMemorialProfile persists the patch and writes an audit row", async () => {
    const id = await seed("profile");
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: {
        memorialId: id,
        headline: "Beloved teacher",
        survivedBy: "Her husband and three children.",
        gender: "female",
        dateOfBirth: "1948-03-02",
        dateOfDeath: "2026-01-15",
        birthPlace: "Enugu",
      },
      deps: deps(),
    });

    const m = await admin<
      {
        headline: string;
        survived_by: string;
        gender: string;
        date_of_birth: string;
        birth_place: string;
      }[]
    >`select headline, survived_by, gender, date_of_birth, birth_place from memorials where id = ${id}`;
    expect(m[0]).toMatchObject({
      headline: "Beloved teacher",
      survived_by: "Her husband and three children.",
      gender: "female",
      birth_place: "Enugu",
    });

    const audit =
      await admin`select action from audit_logs where memorial_id = ${id} and action = 'memorial.profile_updated'`;
    expect(audit).toHaveLength(1);
  });

  it("a year-only birth date is stored as YYYY-01-01 with birth_year_only set", async () => {
    const id = await seed("birthyear");
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, dateOfBirth: "1947-06-30", birthYearOnly: true },
      deps: deps(),
    });
    const m = await admin<
      { date_of_birth: string; birth_year_only: boolean }[]
    >`select date_of_birth::text, birth_year_only from memorials where id = ${id}`;
    expect(m[0]).toEqual({ date_of_birth: "1947-01-01", birth_year_only: true });
  });

  it("RLS: a stranger cannot edit the profile (reads as not_found)", async () => {
    const id = await seed("profile-rls");
    await expect(
      updateMemorialProfile({
        caller: caller(STRANGER),
        input: { memorialId: id, headline: "hijacked" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    const m = await admin`select headline from memorials where id = ${id}`;
    expect(m[0]?.headline).toBeNull();
  });

  it("updateMemorialPrivacy changes visibility; indexing only allowed while public", async () => {
    const id = await seed("privacy");
    const a = await updateMemorialPrivacy({
      caller: caller(OWNER),
      input: { memorialId: id, visibility: "public", searchIndexingEnabled: true },
      deps: deps(),
    });
    expect(a).toMatchObject({ visibility: "public", searchIndexingEnabled: true });

    const b = await updateMemorialPrivacy({
      caller: caller(OWNER),
      input: { memorialId: id, visibility: "private" },
      deps: deps(),
    });
    expect(b).toMatchObject({ visibility: "private", searchIndexingEnabled: false });

    const row =
      await admin`select visibility, search_indexing_enabled from privacy_settings where memorial_id = ${id}`;
    expect(row[0]).toMatchObject({ visibility: "private", search_indexing_enabled: false });
  });

  it("RLS: a content_editor lacks privacy.manage and is denied by the DB", async () => {
    const id = await seed("privacy-rls");
    await admin`insert into memorial_memberships (id, memorial_id, profile_id, role, status, invited_by)
      values (${randomUUID()}, ${id}, ${STRANGER}, 'content_editor', 'active', ${OWNER})`;

    await expect(
      updateMemorialPrivacy({
        caller: caller(STRANGER),
        input: { memorialId: id, visibility: "public" },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    const row = await admin`select visibility from privacy_settings where memorial_id = ${id}`;
    expect(row[0]?.visibility).toBe("private");
  });

  it("updateMemorialFeatures toggles a flag and audits it", async () => {
    const id = await seed("features");
    const res = await updateMemorialFeatures({
      caller: caller(OWNER),
      input: { memorialId: id, tributeModerationEnabled: false, candlesEnabled: false },
      deps: deps(),
    });
    expect(res).toMatchObject({ tributeModerationEnabled: false, candlesEnabled: false });

    const row =
      await admin`select tribute_moderation_enabled, candles_enabled from feature_settings where memorial_id = ${id}`;
    expect(row[0]).toMatchObject({ tribute_moderation_enabled: false, candles_enabled: false });

    const audit =
      await admin`select action from audit_logs where memorial_id = ${id} and action = 'memorial.features_changed'`;
    expect(audit).toHaveLength(1);
  });
});
