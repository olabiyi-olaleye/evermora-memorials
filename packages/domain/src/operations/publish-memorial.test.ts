import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { publishMemorial } from "./publish-memorial";
import { saveStorySection } from "./save-story-section";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const STRANGER = "a0000000-0000-4000-a000-000000000009";

/** A draft memorial that already meets the minimum-content bar (one published story section). */
async function seedDraft(h: Harness): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
    deps: h.deps,
  });
  await saveStorySection({
    caller: caller(OWNER),
    input: {
      memorialId: res.memorialId,
      title: "Her life",
      body: "A teacher for forty years.",
      status: "published",
    },
    deps: h.deps,
  });
  h.events.drain();
  return res.memorialId;
}

/** A draft memorial with NO content yet. */
async function seedEmptyDraft(h: Harness): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
    deps: h.deps,
  });
  h.events.drain();
  return res.memorialId;
}

describe("publishMemorial", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 12 },
        (_, i) => `${i}${i}${i}${i}${i}${i}${i}${i}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("publishes a draft: status + published_at + canonical slug returned", async () => {
    const id = await seedDraft(h);
    const res = await publishMemorial({
      caller: caller(OWNER),
      input: { memorialId: id },
      deps: h.deps,
    });

    expect(res.status).toBe("published");
    expect(res.canonicalSlug).toBe("josephine-okafor");
    expect(res.publishedAt).toBe("2026-09-02T12:00:00.000Z");
    expect(h.db.state.memorials.get(id)?.status).toBe("published");
  });

  it("records a memorial.published audit row and domain event", async () => {
    const id = await seedDraft(h);
    await publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps });

    expect(h.db.state.audit).toContainEqual(
      expect.objectContaining({ action: "memorial.published", entityId: id }),
    );
    const drained = h.events.drain();
    expect(drained[0]).toMatchObject({ name: "memorial.published", payload: { memorialId: id } });
  });

  it("does NOT require completed funeral information", async () => {
    const id = await seedDraft(h);
    expect(h.db.state.memorials.get(id)?.funeralPlanningStatus).toBe("not_started");
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).resolves.toMatchObject({ status: "published" });
  });

  it("leaves search indexing OFF (indexing is separate from publication)", async () => {
    const id = await seedDraft(h);
    await publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps });
    expect(h.db.state.privacy.get(id)?.searchIndexingEnabled).toBe(false);
  });

  it("requires a portrait OR a published story section before publishing", async () => {
    const id = await seedEmptyDraft(h);
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({
      code: "precondition_failed",
      details: { reason: "missing_minimum_content" },
    });

    // A draft story section is not enough…
    await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Notes", body: "wip", status: "draft" },
      deps: h.deps,
    });
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ details: { reason: "missing_minimum_content" } });

    // …but a published one is.
    await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Her life", body: "A teacher.", status: "published" },
      deps: h.deps,
    });
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).resolves.toMatchObject({ status: "published" });
  });

  it("a portrait alone satisfies the content bar", async () => {
    const id = await seedEmptyDraft(h);
    h.db.state.memorials.get(id)!.portraitMediaId = "11111111-1111-4111-8111-111111111111";
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).resolves.toMatchObject({ status: "published" });
  });

  it("rejects an unauthenticated caller", async () => {
    const id = await seedDraft(h);
    await expect(
      publishMemorial({ caller: caller(null), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects an authenticated caller with no role on the memorial", async () => {
    const id = await seedDraft(h);
    await expect(
      publishMemorial({ caller: caller(STRANGER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(h.db.state.memorials.get(id)?.status).toBe("draft");
  });

  it("rejects a tribute_moderator (lacks memorial.edit)", async () => {
    const id = await seedDraft(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      publishMemorial({ caller: caller(STRANGER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("returns not_found for a missing memorial", async () => {
    await expect(
      publishMemorial({
        caller: caller(OWNER),
        input: { memorialId: "00000000-0000-4000-8000-000000000000" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("is a conflict to publish an already-published memorial", async () => {
    const id = await seedDraft(h);
    await publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps });
    h.events.drain();
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({
      code: "conflict",
      details: { reason: "memorial_already_published" },
    });
    expect(h.events.size).toBe(0);
  });

  it("is an invalid-state precondition to publish an archived memorial", async () => {
    const id = await seedDraft(h);
    h.db.state.memorials.get(id)!.status = "archived";
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({
      code: "precondition_failed",
      details: { reason: "memorial_invalid_state" },
    });
  });

  it("rolls back on an audit-write failure", async () => {
    const id = await seedDraft(h);
    h.db.failNext("audit.record");
    await expect(
      publishMemorial({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toBeInstanceOf(Error);
    expect(h.db.state.memorials.get(id)?.status).toBe("draft");
  });
});
