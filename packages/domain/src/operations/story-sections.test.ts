import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { removeStorySection } from "./remove-story-section";
import { reorderStorySections } from "./reorder-story-sections";
import { saveStorySection } from "./save-story-section";
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

describe("story section operations", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("creates a section, appending after the last displayOrder", async () => {
    const id = await seed(h);
    const a = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Early life", body: "Born in Enugu." },
      deps: h.deps,
    });
    const b = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Career", body: "Taught for 40 years.", status: "published" },
      deps: h.deps,
    });
    expect(a.created).toBe(true);
    expect(a.section.displayOrder).toBe(0);
    expect(b.section.displayOrder).toBe(1);
    expect(b.section.status).toBe("published");
    expect(h.db.state.audit.filter((x) => x.action === "story_section.created")).toHaveLength(2);
  });

  it("updates an existing section by id", async () => {
    const id = await seed(h);
    const { section } = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Draft", body: "wip" },
      deps: h.deps,
    });
    const updated = await saveStorySection({
      caller: caller(OWNER),
      input: {
        memorialId: id,
        id: section.id,
        title: "Her life",
        body: "A teacher.",
        status: "published",
      },
      deps: h.deps,
    });
    expect(updated.created).toBe(false);
    expect(updated.section.title).toBe("Her life");
    expect(updated.section.status).toBe("published");
  });

  it("rejects an empty heading or body", async () => {
    const id = await seed(h);
    await expect(
      saveStorySection({
        caller: caller(OWNER),
        input: { memorialId: id, title: "  ", body: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("forbids a caller without story.edit", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      saveStorySection({
        caller: caller(STRANGER),
        input: { memorialId: id, title: "x", body: "y" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("reorders sections and rejects a mismatched list", async () => {
    const id = await seed(h);
    const one = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "One", body: "1" },
      deps: h.deps,
    });
    const two = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Two", body: "2" },
      deps: h.deps,
    });

    await reorderStorySections({
      caller: caller(OWNER),
      input: { memorialId: id, orderedIds: [two.section.id, one.section.id] },
      deps: h.deps,
    });
    const list = h.db.state.story
      .filter((s) => !s.deletedAt)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    expect(list[0]!.id).toBe(two.section.id);

    await expect(
      reorderStorySections({
        caller: caller(OWNER),
        input: { memorialId: id, orderedIds: [one.section.id] },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "order_mismatch" } });
  });

  it("soft-deletes a section", async () => {
    const id = await seed(h);
    const { section } = await saveStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Gone", body: "bye" },
      deps: h.deps,
    });
    await removeStorySection({
      caller: caller(OWNER),
      input: { memorialId: id, id: section.id },
      deps: h.deps,
    });
    expect(h.db.state.story.find((s) => s.id === section.id)?.deletedAt).not.toBeNull();
    await expect(
      removeStorySection({
        caller: caller(OWNER),
        input: { memorialId: id, id: section.id },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("rolls back a create when the audit write fails", async () => {
    const id = await seed(h);
    h.db.failNext("audit.record");
    await expect(
      saveStorySection({
        caller: caller(OWNER),
        input: { memorialId: id, title: "x", body: "y" },
        deps: h.deps,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(h.db.state.story.filter((s) => !s.deletedAt)).toHaveLength(0);
  });
});
