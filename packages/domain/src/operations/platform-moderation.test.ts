import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { resolveReport, setMemorialModeration, updateServiceRequest } from "./platform-moderation";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const STAFF = "a0000000-0000-4000-a000-0000000000ff";
const staffCaller = caller(STAFF, { isPlatformAdmin: true });

async function seedPublished(h: Harness): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
    deps: h.deps,
  });
  const m = h.db.state.memorials.get(res.memorialId)!;
  m.status = "published";
  m.publishedAt = "2026-08-01T00:00:00.000Z";
  h.events.drain();
  return res.memorialId;
}

describe("platform moderation", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 12 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("staff suspend a memorial, then restore it to its prior published state", async () => {
    const id = await seedPublished(h);

    await setMemorialModeration({
      caller: staffCaller,
      input: { memorialId: id, action: "suspend", reason: "Impersonation report upheld." },
      deps: h.deps,
    });
    expect(h.db.state.memorials.get(id)!.status).toBe("suspended");
    expect(h.db.state.audit.some((a) => a.action === "memorial.suspended")).toBe(true);

    const restored = await setMemorialModeration({
      caller: staffCaller,
      input: { memorialId: id, action: "restore" },
      deps: h.deps,
    });
    expect(restored.status).toBe("published");
    expect(h.db.state.audit.some((a) => a.action === "memorial.restored")).toBe(true);
  });

  it("a non-staff caller cannot moderate", async () => {
    const id = await seedPublished(h);
    await expect(
      setMemorialModeration({
        caller: caller(OWNER),
        input: { memorialId: id, action: "suspend" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("restore rejects a memorial that is not suspended", async () => {
    const id = await seedPublished(h);
    await expect(
      setMemorialModeration({
        caller: staffCaller,
        input: { memorialId: id, action: "restore" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "not_suspended" } });
  });

  it("resolveReport marks a report actioned with a note + resolver stamp", async () => {
    h.db.state.reports.push({
      id: "r-1",
      memorialId: null,
      tributeId: "t-1",
      reporterProfileId: null,
      reporterEmail: null,
      reason: "abuse",
      details: "slur",
      submittedIp: null,
    });
    const res = await resolveReport({
      caller: staffCaller,
      input: { reportId: "r-1", status: "actioned", note: "Tribute hidden." },
      deps: h.deps,
    });
    expect(res.report).toMatchObject({ status: "actioned", resolvedBy: STAFF });
    expect(res.report.resolvedAt).not.toBeNull();
    expect(res.report.resolutionNote).toBe("Tribute hidden.");
  });

  it("updateServiceRequest assigns to the acting staffer + moves status", async () => {
    h.db.state.serviceRequests.push({
      id: "sr-1",
      memorialId: null,
      requestedBy: null,
      contactName: "Grace",
      contactEmail: "grace@example.test",
      contactPhone: null,
      serviceType: "printing",
      details: null,
      submittedIp: null,
    });
    const res = await updateServiceRequest({
      caller: staffCaller,
      input: {
        requestId: "sr-1",
        status: "in_review",
        assignToMe: true,
        internalNote: "Called back.",
      },
      deps: h.deps,
    });
    expect(res.request).toMatchObject({
      status: "in_review",
      assignedTo: STAFF,
      internalNotes: "Called back.",
    });
    expect(h.db.state.audit.some((a) => a.action === "service_request.updated")).toBe(true);
  });
});
