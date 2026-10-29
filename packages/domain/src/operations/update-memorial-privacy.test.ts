import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { updateMemorialPrivacy } from "./update-memorial-privacy";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const STRANGER = "a0000000-0000-4000-a000-000000000009";

async function seedDraft(h: Harness): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
    deps: h.deps,
  });
  h.events.drain();
  return res.memorialId;
}

describe("updateMemorialPrivacy", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 12 },
        (_, i) => `${i}${i}${i}${i}${i}${i}${i}${i}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("changes visibility and records an audit row", async () => {
    const id = await seedDraft(h);
    const res = await updateMemorialPrivacy({
      caller: caller(OWNER),
      input: { memorialId: id, visibility: "anyone_with_link" },
      deps: h.deps,
    });
    expect(res.visibility).toBe("anyone_with_link");
    expect(h.db.state.privacy.get(id)!.visibility).toBe("anyone_with_link");
    expect(h.db.state.audit).toContainEqual(
      expect.objectContaining({ action: "memorial.privacy_changed", entityId: id }),
    );
  });

  it("allows search indexing only when the memorial is public", async () => {
    const id = await seedDraft(h);
    // not public yet → indexing request ignored
    const a = await updateMemorialPrivacy({
      caller: caller(OWNER),
      input: { memorialId: id, searchIndexingEnabled: true },
      deps: h.deps,
    });
    expect(a.searchIndexingEnabled).toBe(false);

    // go public + index
    const b = await updateMemorialPrivacy({
      caller: caller(OWNER),
      input: { memorialId: id, visibility: "public", searchIndexingEnabled: true },
      deps: h.deps,
    });
    expect(b).toMatchObject({ visibility: "public", searchIndexingEnabled: true });
  });

  it("forces indexing off when leaving public", async () => {
    const id = await seedDraft(h);
    await updateMemorialPrivacy({
      caller: caller(OWNER),
      input: { memorialId: id, visibility: "public", searchIndexingEnabled: true },
      deps: h.deps,
    });
    const res = await updateMemorialPrivacy({
      caller: caller(OWNER),
      input: { memorialId: id, visibility: "private" },
      deps: h.deps,
    });
    expect(res).toMatchObject({ visibility: "private", searchIndexingEnabled: false });
  });

  it("rejects an empty patch", async () => {
    const id = await seedDraft(h);
    await expect(
      updateMemorialPrivacy({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("forbids a content_editor (needs privacy.manage)", async () => {
    const id = await seedDraft(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "content_editor",
      status: "active",
    });
    await expect(
      updateMemorialPrivacy({
        caller: caller(STRANGER),
        input: { memorialId: id, visibility: "public" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows an admin", async () => {
    const id = await seedDraft(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "admin",
      status: "active",
    });
    await expect(
      updateMemorialPrivacy({
        caller: caller(STRANGER),
        input: { memorialId: id, visibility: "public" },
        deps: h.deps,
      }),
    ).resolves.toMatchObject({ visibility: "public" });
  });

  it("rejects an unauthenticated caller", async () => {
    const id = await seedDraft(h);
    await expect(
      updateMemorialPrivacy({
        caller: caller(null),
        input: { memorialId: id, visibility: "public" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rolls back on an audit failure", async () => {
    const id = await seedDraft(h);
    h.db.failNext("audit.record");
    await expect(
      updateMemorialPrivacy({
        caller: caller(OWNER),
        input: { memorialId: id, visibility: "public" },
        deps: h.deps,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(h.db.state.privacy.get(id)!.visibility).toBe("private");
  });
});
