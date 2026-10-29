import { describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { ANON, caller, harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";

describe("createMemorial", () => {
  it("creates a draft memorial owned by the caller with a canonical slug", async () => {
    const { db, deps } = harness();
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Josephine Adaeze Okafor", slug: "josephine-okafor" },
      deps,
    });

    expect(res.status).toBe("draft");
    expect(res.canonicalSlug).toBe("josephine-okafor");
    const m = db.state.memorials.get(res.memorialId);
    expect(m?.status).toBe("draft");
    expect(m?.createdBy).toBe(OWNER);
  });

  it("makes the creator the active OWNER (via the DB trigger model)", async () => {
    const { db, deps } = harness();
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Ada Test" },
      deps,
    });
    const membership = db.state.memberships.find((x) => x.memorialId === res.memorialId);
    expect(membership).toMatchObject({ profileId: OWNER, role: "owner", status: "active" });
  });

  it("provisions privacy defaults: private, NOT search-indexed", async () => {
    const { db, deps } = harness();
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Ada Test" },
      deps,
    });
    expect(db.state.privacy.get(res.memorialId)).toMatchObject({
      visibility: "private",
      searchIndexingEnabled: false,
    });
  });

  it("provisions the approved feature defaults", async () => {
    const { db, deps } = harness();
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Ada Test" },
      deps,
    });
    expect(db.state.feature.get(res.memorialId)).toMatchObject({
      tributesEnabled: true,
      tributeModerationEnabled: true,
      photoContributionsEnabled: false,
      candlesEnabled: true,
      sharingEnabled: true,
      qrCodeEnabled: true,
      familySectionEnabled: false,
    });
  });

  it("leaves funeral planning at not_started, independent of the memorial lifecycle", async () => {
    const { db, deps } = harness();
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Ada Test" },
      deps,
    });
    expect(db.state.memorials.get(res.memorialId)?.funeralPlanningStatus).toBe("not_started");
  });

  it("records a memorial.created audit row and domain event", async () => {
    const { db, deps, events } = harness();
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Ada Test" },
      deps,
    });

    expect(db.state.audit).toContainEqual(
      expect.objectContaining({
        action: "memorial.created",
        entityType: "memorial",
        entityId: res.memorialId,
        actorProfileId: OWNER,
        actorKind: "user",
      }),
    );
    const drained = events.drain();
    expect(drained).toHaveLength(1);
    expect(drained[0]).toMatchObject({
      name: "memorial.created",
      payload: { memorialId: res.memorialId },
    });
  });

  it("derives the slug from the name when none is given", async () => {
    const { deps } = harness();
    const res = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Pa Joseph Òláléyé" },
      deps,
    });
    expect(res.canonicalSlug).toBe("pa-joseph-olaleye");
  });

  it("rejects an unauthenticated caller", async () => {
    const { deps } = harness();
    await expect(
      createMemorial({ caller: ANON, input: { fullName: "Nobody" }, deps }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("rejects an empty name (validation)", async () => {
    const { deps } = harness();
    await expect(
      createMemorial({ caller: caller(OWNER), input: { fullName: "   " }, deps }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("rejects date of death before date of birth", async () => {
    const { deps } = harness();
    await expect(
      createMemorial({
        caller: caller(OWNER),
        input: { fullName: "Ada", dateOfBirth: "1950-01-01", dateOfDeath: "1949-01-01" },
        deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "dates_out_of_order" } });
  });

  it("rejects an invalid slug", async () => {
    const { deps } = harness();
    await expect(
      createMemorial({ caller: caller(OWNER), input: { fullName: "Ada", slug: "--" }, deps }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "slug_invalid" } });
  });

  it("rejects a reserved slug", async () => {
    const { deps } = harness();
    await expect(
      createMemorial({
        caller: caller(OWNER),
        input: { fullName: "Admin Person", slug: "admin" },
        deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "slug_reserved" } });
  });

  it("maps a slug unique-violation to SlugUnavailableError", async () => {
    const { db, deps } = harness();
    // seed an existing slug
    db.state.slugs.push({
      id: "seed",
      memorialId: "other" as never,
      slug: "taken-name",
      isCanonical: true,
      redirectEnabled: true,
      retiredAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    });
    await expect(
      createMemorial({ caller: caller(OWNER), input: { fullName: "X", slug: "taken-name" }, deps }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "slug_unavailable" } });
  });

  it("rolls back the memorial when the slug insert fails", async () => {
    const { db, deps } = harness();
    db.failNext("slug.addCanonical");
    await expect(
      createMemorial({ caller: caller(OWNER), input: { fullName: "Rollback Test" }, deps }),
    ).rejects.toBeInstanceOf(Error);
    expect(db.state.memorials.size).toBe(0);
    expect(db.state.memberships).toHaveLength(0);
    expect(db.state.audit).toHaveLength(0);
  });

  it("rolls back everything when the audit write fails", async () => {
    const { db, deps } = harness();
    db.failNext("audit.record");
    await expect(
      createMemorial({ caller: caller(OWNER), input: { fullName: "Audit Rollback" }, deps }),
    ).rejects.toBeInstanceOf(Error);
    expect(db.state.memorials.size).toBe(0);
    expect(db.state.slugs).toHaveLength(0);
  });
});
