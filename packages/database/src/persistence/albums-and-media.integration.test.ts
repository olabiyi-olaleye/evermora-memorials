/**
 * Integration tests for the Phase 5F album / media domain operations against a
 * real local Supabase / PostgreSQL. Exercises `recordMedia` etc. through
 * transaction-scoped RLS (`media_write_gallery`). Storage-object handling is
 * the transport layer's job and is not covered here.
 *
 * Gated on `DATABASE_URL`.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createMemorial,
  DomainEventBuffer,
  recordMedia,
  removeAlbum,
  removeMedia,
  saveAlbum,
  setMemorialCover,
  setMemorialPortrait,
  systemClock,
  updateMedia,
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

const RUN = `mx${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const slug = (n: string) => `${RUN}-${n}`;

function caller(userId: string | null): CallerContext {
  return {
    userId: userId as CallerContext["userId"],
    isPlatformAdmin: false,
    memorialRoles: new Map(),
  };
}

run("album & media operations (integration)", () => {
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
      input: { fullName: `Photos ${n}`, slug: slug(n) },
      deps: deps(),
    });
    return res.memorialId;
  }

  function upload(memorialId: string, file: string, albumId?: string) {
    return recordMedia({
      caller: caller(OWNER),
      input: {
        memorialId,
        albumId: albumId ?? null,
        storageBucket: "memorial-private",
        storagePath: `${memorialId}/gallery/${file}`,
        mimeType: "image/jpeg",
        byteSize: 5000,
        width: 800,
        height: 600,
      },
      deps: deps(),
    });
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

  it("records media into an album, updates a caption, sets a portrait", async () => {
    const id = await seed("album");
    const album = await saveAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Church", status: "published" },
      deps: deps(),
    });
    const m = await upload(id, "one.jpg", album.album.id);

    const row =
      await admin`select album_id, processing_status, storage_bucket from media where id = ${m.media.id}`;
    expect(row[0]).toMatchObject({
      album_id: album.album.id,
      processing_status: "ready",
      storage_bucket: "memorial-private",
    });

    await updateMedia({
      caller: caller(OWNER),
      input: { memorialId: id, id: m.media.id, caption: "Sunday" },
      deps: deps(),
    });
    const cap = await admin`select caption from media where id = ${m.media.id}`;
    expect(cap[0]?.caption).toBe("Sunday");

    await setMemorialPortrait({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: m.media.id },
      deps: deps(),
    });
    const mem = await admin`select portrait_media_id from memorials where id = ${id}`;
    expect(mem[0]?.portrait_media_id).toBe(m.media.id);

    await setMemorialCover({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: m.media.id },
      deps: deps(),
    });
    const cov = await admin`select cover_media_id from memorials where id = ${id}`;
    expect(cov[0]?.cover_media_id).toBe(m.media.id);
  });

  it("RLS: a stranger cannot record media", async () => {
    const id = await seed("rls");
    await expect(
      recordMedia({
        caller: caller(STRANGER),
        input: {
          memorialId: id,
          storageBucket: "memorial-private",
          storagePath: `${id}/gallery/x.jpg`,
          mimeType: "image/png",
          byteSize: 100,
        },
        deps: deps(),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    const n = await admin<
      { n: number }[]
    >`select count(*)::int n from media where memorial_id = ${id}`;
    expect(n[0]?.n).toBe(0);
  });

  it("removing an album detaches media; removeMedia clears the portrait and returns the path", async () => {
    const id = await seed("detach");
    const album = await saveAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, title: "A" },
      deps: deps(),
    });
    const m = await upload(id, "y.jpg", album.album.id);
    await setMemorialPortrait({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: m.media.id },
      deps: deps(),
    });
    await setMemorialCover({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: m.media.id },
      deps: deps(),
    });

    await removeAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, id: album.album.id },
      deps: deps(),
    });
    const detached = await admin`select album_id from media where id = ${m.media.id}`;
    expect(detached[0]?.album_id).toBeNull();

    const res = await removeMedia({
      caller: caller(OWNER),
      input: { memorialId: id, id: m.media.id },
      deps: deps(),
    });
    expect(res.storagePath).toBe(`${id}/gallery/y.jpg`);
    const mem =
      await admin`select portrait_media_id, cover_media_id from memorials where id = ${id}`;
    expect(mem[0]?.portrait_media_id).toBeNull();
    expect(mem[0]?.cover_media_id).toBeNull();
  });
});
