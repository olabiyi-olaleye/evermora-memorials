import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { updateMemorialProfile } from "./update-memorial-profile";
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

describe("updateMemorialProfile", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 12 },
        (_, i) => `${i}${i}${i}${i}${i}${i}${i}${i}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("updates the descriptive fields and records an audit row", async () => {
    const id = await seedDraft(h);
    const res = await updateMemorialProfile({
      caller: caller(OWNER),
      input: {
        memorialId: id,
        headline: "Teacher, gardener, grandmother",
        survivedBy: "Her children and grandchildren.",
        gender: "female",
        biographySummary: "She taught three generations of the town's children.",
        dateOfBirth: "1948-03-02",
        dateOfDeath: "2026-01-15",
        birthPlace: "Enugu",
      },
      deps: h.deps,
    });

    expect(res.fullName).toBe("Josephine Okafor");
    const row = h.db.state.memorials.get(id)!;
    expect(row.headline).toBe("Teacher, gardener, grandmother");
    expect(row.survivedBy).toBe("Her children and grandchildren.");
    expect(row.gender).toBe("female");
    expect(row.dateOfBirth).toBe("1948-03-02");
    expect(row.birthPlace).toBe("Enugu");
    expect(h.db.state.audit).toContainEqual(
      expect.objectContaining({ action: "memorial.profile_updated", entityId: id }),
    );
  });

  it("treats an empty survivedBy as 'clear this field', same as headline", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, survivedBy: "Her husband and three children." },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)!.survivedBy).toBe("Her husband and three children.");

    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, survivedBy: "  " },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)!.survivedBy).toBeNull();
  });

  it("gender: set, cleared via explicit null (not an empty string, it isn't free text), and validated", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, gender: "male" },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)!.gender).toBe("male");

    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, gender: null },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)!.gender).toBeNull();

    await expect(
      updateMemorialProfile({
        caller: caller(OWNER),
        // @ts-expect-error — only "male" | "female" | null is valid.
        input: { memorialId: id, gender: "nonbinary" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "invalid_input" } });
  });

  it("treats an empty string as 'clear this field'", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, headline: "temp" },
      deps: h.deps,
    });
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, headline: "  " },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)!.headline).toBeNull();
  });

  it("only writes the keys provided", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, birthPlace: "Enugu" },
      deps: h.deps,
    });
    const row = h.db.state.memorials.get(id)!;
    expect(row.birthPlace).toBe("Enugu");
    expect(row.fullName).toBe("Josephine Okafor");
    expect(row.headline).toBeNull();
  });

  it("rejects date of death before date of birth (merged with stored values)", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, dateOfBirth: "1950-01-01" },
      deps: h.deps,
    });
    await expect(
      updateMemorialProfile({
        caller: caller(OWNER),
        input: { memorialId: id, dateOfDeath: "1949-01-01" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "dates_out_of_order" } });
  });

  it("stores a year-only birth date as YYYY-01-01 with the flag set", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, dateOfBirth: "1947-06-30", birthYearOnly: true },
      deps: h.deps,
    });
    const row = h.db.state.memorials.get(id)!;
    expect(row.dateOfBirth).toBe("1947-01-01");
    expect(row.birthYearOnly).toBe(true);
  });

  it("re-normalises the stored date when only the year-only flag is turned on", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, dateOfBirth: "1947-06-30" },
      deps: h.deps,
    });
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, birthYearOnly: true },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)!.dateOfBirth).toBe("1947-01-01");
  });

  it("clears the year-only flag when the birth date is cleared", async () => {
    const id = await seedDraft(h);
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, dateOfBirth: "1947-01-01", birthYearOnly: true },
      deps: h.deps,
    });
    await updateMemorialProfile({
      caller: caller(OWNER),
      input: { memorialId: id, dateOfBirth: null },
      deps: h.deps,
    });
    const row = h.db.state.memorials.get(id)!;
    expect(row.dateOfBirth).toBeNull();
    expect(row.birthYearOnly).toBe(false);
  });

  it("rejects an empty patch", async () => {
    const id = await seedDraft(h);
    await expect(
      updateMemorialProfile({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "empty_patch" } });
  });

  it("rejects an unauthenticated caller", async () => {
    const id = await seedDraft(h);
    await expect(
      updateMemorialProfile({
        caller: caller(null),
        input: { memorialId: id, headline: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("forbids a caller with no edit permission", async () => {
    const id = await seedDraft(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      updateMemorialProfile({
        caller: caller(STRANGER),
        input: { memorialId: id, headline: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows a content_editor", async () => {
    const id = await seedDraft(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "content_editor",
      status: "active",
    });
    await expect(
      updateMemorialProfile({
        caller: caller(STRANGER),
        input: { memorialId: id, headline: "x" },
        deps: h.deps,
      }),
    ).resolves.toMatchObject({ memorialId: id });
  });

  it("refuses to edit a suspended memorial", async () => {
    const id = await seedDraft(h);
    h.db.state.memorials.get(id)!.status = "suspended";
    await expect(
      updateMemorialProfile({
        caller: caller(OWNER),
        input: { memorialId: id, headline: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "precondition_failed" });
  });

  it("rolls back the profile write when the audit write fails", async () => {
    const id = await seedDraft(h);
    h.db.failNext("audit.record");
    await expect(
      updateMemorialProfile({
        caller: caller(OWNER),
        input: { memorialId: id, headline: "x" },
        deps: h.deps,
      }),
    ).rejects.toBeInstanceOf(Error);
    expect(h.db.state.memorials.get(id)!.headline).toBeNull();
  });
});
