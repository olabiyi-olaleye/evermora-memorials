import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { archiveFamilyUpdate, publishFamilyUpdate } from "./family-update-lifecycle";
import { removeFamilyUpdate } from "./remove-family-update";
import { saveFamilyUpdate } from "./save-family-update";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const STRANGER = "a0000000-0000-4000-a000-000000000009";

async function seed(h: Harness): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
    deps: h.deps,
  });
  h.events.drain();
  return res.memorialId;
}

async function draft(h: Harness, memorialId: string, over: Record<string, unknown> = {}) {
  const res = await saveFamilyUpdate({
    caller: caller(OWNER),
    input: { memorialId, title: "Thank you", body: "We are grateful.", ...over },
    deps: h.deps,
  });
  h.events.drain();
  return res.update.id;
}

describe("family updates", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("creates a draft update, sanitising the body, and records it", async () => {
    const id = await seed(h);
    const res = await saveFamilyUpdate({
      caller: caller(OWNER),
      input: {
        memorialId: id,
        title: "  Livestream   details  ",
        body: "Watch here <script>alert(1)</script> at 10am.",
        importance: "high",
      },
      deps: h.deps,
    });
    expect(res.created).toBe(true);
    const u = h.db.state.familyUpdates[0]!;
    expect(u).toMatchObject({ status: "draft", importance: "high", title: "Livestream details" });
    expect(u.body).not.toContain("<script>");
    expect(h.db.state.audit.some((a) => a.action === "family_update.created")).toBe(true);
  });

  it("forbids a caller without updates.publish", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      saveFamilyUpdate({
        caller: caller(STRANGER),
        input: { memorialId: id, title: "x", body: "y" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects a funeral event from another memorial", async () => {
    const id = await seed(h);
    await expect(
      saveFamilyUpdate({
        caller: caller(OWNER),
        input: {
          memorialId: id,
          title: "x",
          body: "y",
          funeralEventId: "abababab-abab-4aba-8aba-abababababab",
        },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "bad_funeral_event" } });
  });

  it("publishes a draft, then archives and re-publishes it", async () => {
    const id = await seed(h);
    const updateId = await draft(h, id);

    const published = await publishFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId },
      deps: h.deps,
    });
    expect(published.status).toBe("published");
    const row = h.db.state.familyUpdates.find((u) => u.id === updateId)!;
    expect(row.publishedAt).not.toBeNull();
    expect(h.events.drain()[0]).toMatchObject({ name: "family_update.published" });

    await archiveFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId },
      deps: h.deps,
    });
    expect(h.db.state.familyUpdates.find((u) => u.id === updateId)!.status).toBe("archived");

    const stamp = row.publishedAt;
    const republished = await publishFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId },
      deps: h.deps,
    });
    expect(republished.status).toBe("published");
    // keeps the original published_at
    expect(h.db.state.familyUpdates.find((u) => u.id === updateId)!.publishedAt).toBe(stamp);
  });

  it("archive only from published", async () => {
    const id = await seed(h);
    const updateId = await draft(h, id);
    await expect(
      archiveFamilyUpdate({
        caller: caller(OWNER),
        input: { memorialId: id, updateId },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "invalid_transition" } });
  });

  it("soft-deletes an update", async () => {
    const id = await seed(h);
    const updateId = await draft(h, id);
    await removeFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId },
      deps: h.deps,
    });
    expect(h.db.state.familyUpdates.find((u) => u.id === updateId)!.deletedAt).not.toBeNull();
  });
});
