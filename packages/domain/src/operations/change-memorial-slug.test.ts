import { beforeEach, describe, expect, it } from "vitest";
import { changeMemorialSlug } from "./change-memorial-slug";
import { createMemorial } from "./create-memorial";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const STRANGER = "a0000000-0000-4000-a000-000000000009";

async function seed(h: Harness, slug = "josephine-okafor"): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug },
    deps: h.deps,
  });
  h.events.drain();
  return res.memorialId;
}

describe("changeMemorialSlug", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i + 10).toString().padStart(8, "0")}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("promotes a new canonical slug and retires the old one as an alias", async () => {
    const id = await seed(h);
    const res = await changeMemorialSlug({
      caller: caller(OWNER),
      input: { memorialId: id, newSlug: "Mama Josephine" },
      deps: h.deps,
    });

    expect(res.canonicalSlug).toBe("mama-josephine");
    expect(res.previousCanonicalSlug).toBe("josephine-okafor");
    expect(res.wasExistingAlias).toBe(false);

    const slugs = h.db.state.slugs.filter((s) => s.memorialId === id);
    const canonical = slugs.filter((s) => s.isCanonical);
    expect(canonical).toHaveLength(1);
    expect(canonical[0]!.slug).toBe("mama-josephine");

    const old = slugs.find((s) => s.slug === "josephine-okafor")!;
    expect(old.isCanonical).toBe(false);
    expect(old.retiredAt).toBe("2026-09-02T12:00:00.000Z");
  });

  it("normalises the requested slug", async () => {
    const id = await seed(h);
    const res = await changeMemorialSlug({
      caller: caller(OWNER),
      input: { memorialId: id, newSlug: "  Pa  Joséph!! " },
      deps: h.deps,
    });
    expect(res.canonicalSlug).toBe("pa-joseph");
  });

  it("re-promotes an existing retired alias instead of duplicating it", async () => {
    const id = await seed(h);
    await changeMemorialSlug({
      caller: caller(OWNER),
      input: { memorialId: id, newSlug: "second-name" },
      deps: h.deps,
    });
    h.events.drain();
    // now change back to the original
    const res = await changeMemorialSlug({
      caller: caller(OWNER),
      input: { memorialId: id, newSlug: "josephine-okafor" },
      deps: h.deps,
    });
    expect(res.wasExistingAlias).toBe(true);
    expect(res.canonicalSlug).toBe("josephine-okafor");
    const rows = h.db.state.slugs.filter((s) => s.slug === "josephine-okafor");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.isCanonical).toBe(true);
    expect(rows[0]!.retiredAt).toBeNull();
  });

  it("records a memorial.slug_changed audit row + domain event with from/to", async () => {
    const id = await seed(h);
    await changeMemorialSlug({
      caller: caller(OWNER),
      input: { memorialId: id, newSlug: "new-address" },
      deps: h.deps,
    });

    expect(h.db.state.audit).toContainEqual(
      expect.objectContaining({
        action: "memorial.slug_changed",
        metadata: expect.objectContaining({ from: "josephine-okafor", to: "new-address" }),
      }),
    );
    const [ev] = h.events.drain();
    expect(ev).toMatchObject({
      name: "memorial.slug_changed",
      payload: { from: "josephine-okafor", to: "new-address" },
    });
  });

  it("is a conflict to change to the current slug (no-op)", async () => {
    const id = await seed(h);
    await expect(
      changeMemorialSlug({
        caller: caller(OWNER),
        input: { memorialId: id, newSlug: "josephine-okafor" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "no_change" } });
  });

  it("rejects an invalid slug", async () => {
    const id = await seed(h);
    await expect(
      changeMemorialSlug({
        caller: caller(OWNER),
        input: { memorialId: id, newSlug: "12" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "slug_invalid" } });
  });

  it("rejects a reserved slug", async () => {
    const id = await seed(h);
    await expect(
      changeMemorialSlug({
        caller: caller(OWNER),
        input: { memorialId: id, newSlug: "settings" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "slug_reserved" } });
  });

  it("rejects a slug owned by another memorial (unavailable)", async () => {
    const id = await seed(h);
    h.db.state.slugs.push({
      id: "x",
      memorialId: "other-memorial" as never,
      slug: "already-taken",
      isCanonical: true,
      redirectEnabled: true,
      retiredAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    });
    await expect(
      changeMemorialSlug({
        caller: caller(OWNER),
        input: { memorialId: id, newSlug: "already-taken" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "slug_unavailable" } });
  });

  it("rejects a caller without memorial.edit", async () => {
    const id = await seed(h);
    await expect(
      changeMemorialSlug({
        caller: caller(STRANGER),
        input: { memorialId: id, newSlug: "hacked-name" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(h.db.state.slugs.find((s) => s.memorialId === id && s.isCanonical)?.slug).toBe(
      "josephine-okafor",
    );
  });

  it("rolls back (old slug stays canonical) when the audit write fails", async () => {
    const id = await seed(h);
    h.db.failNext("audit.record");
    await expect(
      changeMemorialSlug({
        caller: caller(OWNER),
        input: { memorialId: id, newSlug: "rollback-name" },
        deps: h.deps,
      }),
    ).rejects.toBeInstanceOf(Error);
    const canonical = h.db.state.slugs.filter((s) => s.memorialId === id && s.isCanonical);
    expect(canonical).toHaveLength(1);
    expect(canonical[0]!.slug).toBe("josephine-okafor");
    expect(h.db.state.slugs.some((s) => s.slug === "rollback-name")).toBe(false);
  });
});
