import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import {
  cancelFuneralEvent,
  completeFuneralEvent,
  publishFuneralEvent,
} from "./funeral-event-lifecycle";
import { removeFuneralEvent } from "./remove-funeral-event";
import { saveFuneralEvent } from "./save-funeral-event";
import { setFuneralPlanningStatus } from "./set-funeral-planning-status";
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

async function draftEvent(h: Harness, memorialId: string, over: Record<string, unknown> = {}) {
  const res = await saveFuneralEvent({
    caller: caller(OWNER),
    input: {
      memorialId,
      eventType: "funeral_service",
      title: "Funeral Service",
      eventDate: "2026-08-14",
      startTime: "10:00",
      venueName: "St Monica's Church",
      city: "Enugu",
      ...over,
    },
    deps: h.deps,
  });
  h.events.drain();
  return res.event.id;
}

describe("funeral events", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("creates a draft event and records it", async () => {
    const id = await seed(h);
    const eventId = await draftEvent(h, id);
    void eventId;
    const e = h.db.state.funeralEvents[0]!;
    expect(e).toMatchObject({ status: "draft", title: "Funeral Service", city: "Enugu" });
    expect(h.db.state.audit.some((a) => a.action === "funeral_event.created")).toBe(true);
  });

  it("saves up to five RSVP contacts, trimmed, and replaces them on update", async () => {
    const id = await seed(h);
    const five = Array.from({ length: 5 }, (_, i) => ({
      name: ` Contact ${i + 1} `,
      phone: i === 0 ? "" : `0803000000${i}`,
    }));
    const eventId = await draftEvent(h, id, { contacts: five });
    const e = h.db.state.funeralEvents[0]!;
    expect(e.contacts).toHaveLength(5);
    expect(e.contacts[0]).toEqual({ name: "Contact 1", phone: null });
    expect(e.contacts[1]).toEqual({ name: "Contact 2", phone: "08030000001" });

    await saveFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, id: eventId, title: "Funeral Service", contacts: [] },
      deps: h.deps,
    });
    expect(h.db.state.funeralEvents[0]!.contacts).toEqual([]);
  });

  it("rejects a sixth contact and a contact without a name", async () => {
    const id = await seed(h);
    const six = Array.from({ length: 6 }, (_, i) => ({ name: `C${i}`, phone: null }));
    await expect(
      saveFuneralEvent({
        caller: caller(OWNER),
        input: { memorialId: id, title: "Burial", contacts: six },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
    await expect(
      saveFuneralEvent({
        caller: caller(OWNER),
        input: { memorialId: id, title: "Burial", contacts: [{ name: " ", phone: "0803" }] },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("rejects end time before start time", async () => {
    const id = await seed(h);
    await expect(
      saveFuneralEvent({
        caller: caller(OWNER),
        input: { memorialId: id, title: "Wake", startTime: "18:00", endTime: "17:00" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation", details: { reason: "time_order" } });
  });

  it("accepts an http(s) livestream URL and rejects a javascript: scheme (Phase 5O)", async () => {
    const id = await seed(h);
    const res = await saveFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Service", livestreamUrl: "https://zoom.us/j/123" },
      deps: h.deps,
    });
    expect(res.event.livestreamUrl).toBe("https://zoom.us/j/123");

    await expect(
      saveFuneralEvent({
        caller: caller(OWNER),
        input: {
          memorialId: id,
          title: "Service",
          livestreamUrl: "javascript:alert(document.cookie)",
        },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("forbids a caller without funeral.manage", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      saveFuneralEvent({
        caller: caller(STRANGER),
        input: { memorialId: id, title: "x" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("publish requires a date, then transitions draft → published", async () => {
    const id = await seed(h);
    const noDate = await draftEvent(h, id, { eventDate: undefined });
    await expect(
      publishFuneralEvent({
        caller: caller(OWNER),
        input: { memorialId: id, eventId: noDate },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "precondition_failed", details: { reason: "missing_date" } });

    const withDate = await draftEvent(h, id);
    const res = await publishFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId: withDate },
      deps: h.deps,
    });
    expect(res.status).toBe("published");
    expect(h.db.state.funeralEvents.find((e) => e.id === withDate)!.publishedAt).not.toBeNull();
    expect(h.events.drain()[0]).toMatchObject({ name: "funeral_event.published" });
  });

  it("cancel keeps the record with a reason; a cancelled event can be re-published", async () => {
    const id = await seed(h);
    const eventId = await draftEvent(h, id);
    await publishFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId },
      deps: h.deps,
    });
    h.events.drain();

    const cancelled = await cancelFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId, reason: "Venue unavailable" },
      deps: h.deps,
    });
    expect(cancelled.status).toBe("cancelled");
    const row = h.db.state.funeralEvents.find((e) => e.id === eventId)!;
    expect(row.cancelReason).toBe("Venue unavailable");
    expect(row.cancelledAt).not.toBeNull();

    const republished = await publishFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId },
      deps: h.deps,
    });
    expect(republished.status).toBe("published");
  });

  it("complete only from published", async () => {
    const id = await seed(h);
    const eventId = await draftEvent(h, id);
    await expect(
      completeFuneralEvent({
        caller: caller(OWNER),
        input: { memorialId: id, eventId },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "invalid_transition" } });

    await publishFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId },
      deps: h.deps,
    });
    h.events.drain();
    const res = await completeFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId },
      deps: h.deps,
    });
    expect(res.status).toBe("completed");
  });

  it("soft-deletes an event", async () => {
    const id = await seed(h);
    const eventId = await draftEvent(h, id);
    await removeFuneralEvent({
      caller: caller(OWNER),
      input: { memorialId: id, eventId },
      deps: h.deps,
    });
    expect(h.db.state.funeralEvents.find((e) => e.id === eventId)!.deletedAt).not.toBeNull();
  });

  it("setFuneralPlanningStatus updates the memorial, independent of its lifecycle", async () => {
    const id = await seed(h);
    const res = await setFuneralPlanningStatus({
      caller: caller(OWNER),
      input: { memorialId: id, status: "confirmed" },
      deps: h.deps,
    });
    expect(res.funeralPlanningStatus).toBe("confirmed");
    expect(h.db.state.memorials.get(id)!.status).toBe("draft"); // unchanged
    expect(h.db.state.audit.some((a) => a.action === "memorial.funeral_planning_changed")).toBe(
      true,
    );
  });
});
