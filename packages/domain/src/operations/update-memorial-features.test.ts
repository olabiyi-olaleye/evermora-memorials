import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { updateMemorialFeatures } from "./update-memorial-features";
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

describe("updateMemorialFeatures", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 12 },
        (_, i) => `${i}${i}${i}${i}${i}${i}${i}${i}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("toggles a feature and records an audit row", async () => {
    const id = await seedDraft(h);
    const res = await updateMemorialFeatures({
      caller: caller(OWNER),
      input: { memorialId: id, tributeModerationEnabled: false },
      deps: h.deps,
    });
    expect(res.tributeModerationEnabled).toBe(false);
    expect(res.tributesEnabled).toBe(true);
    expect(h.db.state.feature.get(id)!.tributeModerationEnabled).toBe(false);
    expect(h.db.state.audit).toContainEqual(
      expect.objectContaining({ action: "memorial.features_changed", entityId: id }),
    );
  });

  it("is a no-op (no audit) when nothing actually changes", async () => {
    const id = await seedDraft(h);
    await updateMemorialFeatures({
      caller: caller(OWNER),
      input: { memorialId: id, tributesEnabled: true }, // already true
      deps: h.deps,
    });
    expect(h.db.state.audit.some((a) => a.action === "memorial.features_changed")).toBe(false);
  });

  it("rejects an empty patch", async () => {
    const id = await seedDraft(h);
    await expect(
      updateMemorialFeatures({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("forbids a tribute_moderator (needs memorial.edit)", async () => {
    const id = await seedDraft(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      updateMemorialFeatures({
        caller: caller(STRANGER),
        input: { memorialId: id, funeralEnabled: false },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects an unauthenticated caller", async () => {
    const id = await seedDraft(h);
    await expect(
      updateMemorialFeatures({
        caller: caller(null),
        input: { memorialId: id, funeralEnabled: false },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rolls back on an audit failure", async () => {
    const id = await seedDraft(h);
    h.db.failNext("audit.record");
    await expect(
      updateMemorialFeatures({
        caller: caller(OWNER),
        input: { memorialId: id, sharingEnabled: false },
        deps: h.deps,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(h.db.state.feature.get(id)!.sharingEnabled).toBe(true);
  });
});
