import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { publishMemorial } from "./publish-memorial";
import { recordMedia } from "./record-media";
import { removeAlbum } from "./remove-album";
import { removeMedia } from "./remove-media";
import { reorderMedia } from "./reorder-media";
import { saveAlbum } from "./save-album";
import { setMemorialCover } from "./set-memorial-cover";
import { setMemorialPortrait } from "./set-memorial-portrait";
import { updateMedia } from "./update-media";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const STRANGER = "a0000000-0000-4000-a000-000000000009";
const MID = "e1000000-0000-4000-a000-000000000001";

async function seed(h: Harness): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
    deps: h.deps,
  });
  h.events.drain();
  return res.memorialId;
}

function upload(h: Harness, memorialId: string, path: string, albumId?: string) {
  return recordMedia({
    caller: caller(OWNER),
    input: {
      memorialId,
      albumId: albumId ?? null,
      storageBucket: "memorial-private",
      storagePath: `${memorialId}/gallery/${path}`,
      mimeType: "image/jpeg",
      byteSize: 12345,
      width: 800,
      height: 600,
      checksum: "abc",
    },
    deps: h.deps,
  });
}

describe("albums & media operations", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 30 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("creates an album and records media into it", async () => {
    const id = await seed(h);
    const album = await saveAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Harvest 1988", status: "published" },
      deps: h.deps,
    });
    const media = await upload(h, id, "a.jpg", album.album.id);
    expect(media.media.albumId).toBe(album.album.id);
    expect(media.media.processingStatus).toBe("ready");
    expect(h.db.state.audit.some((a) => a.action === "media.added")).toBe(true);
  });

  it("rejects a storage path that is not under the memorial id", async () => {
    const id = await seed(h);
    await expect(
      recordMedia({
        caller: caller(OWNER),
        input: {
          memorialId: id,
          storageBucket: "memorial-private",
          storagePath: `someone-else/gallery/x.jpg`,
          mimeType: "image/png",
          byteSize: 10,
        },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "path_mismatch" } });
  });

  it("forbids a caller without gallery.manage", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      saveAlbum({
        caller: caller(STRANGER),
        input: { memorialId: id, title: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("updates a photo caption and moves it between albums", async () => {
    const id = await seed(h);
    const a1 = await saveAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, title: "A" },
      deps: h.deps,
    });
    const a2 = await saveAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, title: "B" },
      deps: h.deps,
    });
    const m = await upload(h, id, "p.jpg", a1.album.id);
    const updated = await updateMedia({
      caller: caller(OWNER),
      input: { memorialId: id, id: m.media.id, caption: "At the farm", albumId: a2.album.id },
      deps: h.deps,
    });
    expect(updated.media).toMatchObject({ caption: "At the farm", albumId: a2.album.id });
  });

  it("reorders photos and rejects an unknown id", async () => {
    const id = await seed(h);
    const one = await upload(h, id, "1.jpg");
    const two = await upload(h, id, "2.jpg");
    await reorderMedia({
      caller: caller(OWNER),
      input: { memorialId: id, orderedIds: [two.media.id, one.media.id] },
      deps: h.deps,
    });
    expect(h.db.state.media.find((m) => m.id === two.media.id)?.displayOrder).toBe(0);
    await expect(
      reorderMedia({
        caller: caller(OWNER),
        input: { memorialId: id, orderedIds: ["99999999-9999-4999-8999-999999999999"] },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "unknown_id" } });
  });

  it("removing an album detaches its media but keeps the files", async () => {
    const id = await seed(h);
    const album = await saveAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, title: "A" },
      deps: h.deps,
    });
    const m = await upload(h, id, "x.jpg", album.album.id);
    await removeAlbum({
      caller: caller(OWNER),
      input: { memorialId: id, id: album.album.id },
      deps: h.deps,
    });
    expect(h.db.state.albums.find((a) => a.id === album.album.id)?.deletedAt).not.toBeNull();
    expect(h.db.state.media.find((x) => x.id === m.media.id)?.albumId).toBeNull();
    expect(h.db.state.media.find((x) => x.id === m.media.id)?.deletedAt).toBeNull();
  });

  it("removeMedia returns the storage location and clears a portrait reference", async () => {
    const id = await seed(h);
    const m = await upload(h, id, "portrait.jpg");
    await setMemorialPortrait({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: m.media.id },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)?.portraitMediaId).toBe(m.media.id);

    const res = await removeMedia({
      caller: caller(OWNER),
      input: { memorialId: id, id: m.media.id },
      deps: h.deps,
    });
    expect(res.storagePath).toBe(`${id}/gallery/portrait.jpg`);
    expect(h.db.state.memorials.get(id)?.portraitMediaId).toBeNull();
  });

  it("setMemorialPortrait rejects a photo from another memorial", async () => {
    const id = await seed(h);
    await expect(
      setMemorialPortrait({
        caller: caller(OWNER),
        input: { memorialId: id, mediaId: "11111111-1111-4111-8111-111111111111" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("setMemorialCover sets and clears the share-card image, independent of the portrait", async () => {
    const id = await seed(h);
    const portrait = await upload(h, id, "portrait.jpg");
    const cover = await upload(h, id, "cover.jpg");
    await setMemorialPortrait({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: portrait.media.id },
      deps: h.deps,
    });

    const res = await setMemorialCover({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: cover.media.id },
      deps: h.deps,
    });
    expect(res.coverMediaId).toBe(cover.media.id);
    const row = h.db.state.memorials.get(id)!;
    expect(row.coverMediaId).toBe(cover.media.id);
    expect(row.portraitMediaId).toBe(portrait.media.id);

    await setMemorialCover({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: null },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)?.coverMediaId).toBeNull();
    expect(h.db.state.memorials.get(id)?.portraitMediaId).toBe(portrait.media.id);
  });

  it("setMemorialCover rejects a photo from another memorial", async () => {
    const id = await seed(h);
    await expect(
      setMemorialCover({
        caller: caller(OWNER),
        input: { memorialId: id, mediaId: "11111111-1111-4111-8111-111111111111" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("removeMedia clears a cover reference that points at the removed photo", async () => {
    const id = await seed(h);
    const m = await upload(h, id, "cover.jpg");
    await setMemorialCover({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: m.media.id },
      deps: h.deps,
    });
    await removeMedia({
      caller: caller(OWNER),
      input: { memorialId: id, id: m.media.id },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)?.coverMediaId).toBeNull();
  });

  it("a portrait alone lets an otherwise-empty memorial publish", async () => {
    const id = await seed(h);
    const m = await upload(h, id, "hero.jpg");
    await setMemorialPortrait({
      caller: caller(OWNER),
      input: { memorialId: id, mediaId: m.media.id },
      deps: h.deps,
    });
    h.events.drain();
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).resolves.toMatchObject({ status: "published" });
  });

  it("rolls back a media record when the audit write fails", async () => {
    const id = await seed(h);
    h.db.failNext("audit.record");
    await expect(upload(h, id, "z.jpg")).rejects.toBeInstanceOf(Error);
    expect(h.db.state.media.filter((m) => !m.deletedAt)).toHaveLength(0);
  });

  void MID;
});
