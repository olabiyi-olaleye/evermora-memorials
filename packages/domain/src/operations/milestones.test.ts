import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { removeMilestone } from "./remove-milestone";
import { reorderMilestones } from "./reorder-milestones";
import { saveMilestone } from "./save-milestone";
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

describe("milestone operations", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("creates a milestone from a bare year", async () => {
    const id = await seed(h);
    const res = await saveMilestone({
      caller: caller(OWNER),
      input: { memorialId: id, year: 1966, title: "Qualified as a teacher" },
      deps: h.deps,
    });
    expect(res.created).toBe(true);
    expect(res.milestone).toMatchObject({ year: 1966, onDate: null, status: "published" });
  });

  it("derives the year from a full date", async () => {
    const id = await seed(h);
    const res = await saveMilestone({
      caller: caller(OWNER),
      input: { memorialId: id, onDate: "1945-03-12", title: "Born" },
      deps: h.deps,
    });
    expect(res.milestone.year).toBe(1945);
  });

  it("rejects a year/date mismatch", async () => {
    const id = await seed(h);
    await expect(
      saveMilestone({
        caller: caller(OWNER),
        input: { memorialId: id, year: 1950, onDate: "1945-03-12", title: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("requires a year or a date", async () => {
    const id = await seed(h);
    await expect(
      saveMilestone({
        caller: caller(OWNER),
        input: { memorialId: id, title: "No date" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("forbids a caller without story.edit", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "viewer",
      status: "active",
    });
    await expect(
      saveMilestone({
        caller: caller(STRANGER),
        input: { memorialId: id, year: 2000, title: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("reorders and soft-deletes", async () => {
    const id = await seed(h);
    const a = await saveMilestone({
      caller: caller(OWNER),
      input: { memorialId: id, year: 1945, title: "Born" },
      deps: h.deps,
    });
    const b = await saveMilestone({
      caller: caller(OWNER),
      input: { memorialId: id, year: 1945, title: "Also 1945" },
      deps: h.deps,
    });
    await reorderMilestones({
      caller: caller(OWNER),
      input: { memorialId: id, orderedIds: [b.milestone.id, a.milestone.id] },
      deps: h.deps,
    });
    expect(h.db.state.milestones.find((m) => m.id === b.milestone.id)?.displayOrder).toBe(0);

    await removeMilestone({
      caller: caller(OWNER),
      input: { memorialId: id, id: a.milestone.id },
      deps: h.deps,
    });
    expect(h.db.state.milestones.find((m) => m.id === a.milestone.id)?.deletedAt).not.toBeNull();
  });
});
