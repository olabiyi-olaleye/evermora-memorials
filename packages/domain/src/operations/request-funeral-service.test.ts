import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { requestFuneralService } from "./request-funeral-service";
import { ANON, caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";

const visitor = (ip = "203.0.113.9") => ({
  userId: null,
  isPlatformAdmin: false,
  memorialRoles: new Map(),
  request: { ip },
});

describe("requestFuneralService", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 10 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("an anonymous visitor can submit an enquiry with no memorial", async () => {
    const res = await requestFuneralService({
      caller: ANON,
      input: {
        contactName: "  Grace Nnamdi ",
        contactEmail: "Grace@Example.test",
        serviceType: "printing",
        details: "Need 120 programmes <b>by Friday</b>.",
      },
      deps: h.deps,
    });
    expect(res.status).toBe("new");
    const row = h.db.state.serviceRequests[0]!;
    expect(row).toMatchObject({
      contactName: "Grace Nnamdi",
      contactEmail: "grace@example.test",
      serviceType: "printing",
      memorialId: null,
      requestedBy: null,
    });
    expect(row.details).not.toContain("<b>");
    const a = h.db.state.audit.find((x) => x.action === "service_request.created")!;
    expect(a.actorKind).toBe("anonymous");
    expect(h.events.drain()[0]).toMatchObject({ name: "service_request.created" });
  });

  it("attaches the memorial + requester when a signed-in family member asks", async () => {
    const seed = await createMemorial({
      caller: caller(OWNER),
      input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
      deps: h.deps,
    });
    h.events.drain();

    const res = await requestFuneralService({
      caller: caller(OWNER),
      input: {
        memorialId: seed.memorialId,
        contactName: "Ada Okafor",
        contactEmail: "ada@example.test",
        contactPhone: "+234 800 000 0000",
        serviceType: "livestream",
      },
      deps: h.deps,
    });
    void res;
    expect(h.db.state.serviceRequests[0]).toMatchObject({
      memorialId: seed.memorialId,
      requestedBy: OWNER,
      serviceType: "livestream",
      contactPhone: "+234 800 000 0000",
    });
  });

  it("does not attach a memorial the caller cannot see", async () => {
    await requestFuneralService({
      caller: ANON,
      input: {
        memorialId: "abababab-abab-4aba-8aba-abababababab",
        contactName: "Stranger",
        contactEmail: "s@example.test",
      },
      deps: h.deps,
    });
    expect(h.db.state.serviceRequests[0]!.memorialId).toBeNull();
  });

  it("rejects missing / invalid contact fields", async () => {
    await expect(
      requestFuneralService({
        caller: ANON,
        input: { contactName: "", contactEmail: "not-an-email" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("silently discards a honeypot hit", async () => {
    const res = await requestFuneralService({
      caller: ANON,
      input: { contactName: "Bot", contactEmail: "bot@example.test", website: "http://spam" },
      deps: h.deps,
    });
    expect(res.discarded).toBe(true);
    expect(h.db.state.serviceRequests).toHaveLength(0);
  });

  it("rate-limits repeated enquiries from the same IP (Phase 5O)", async () => {
    for (let i = 0; i < 5; i++) {
      await requestFuneralService({
        caller: visitor("198.51.100.5"),
        input: { contactName: `Visitor ${i}`, contactEmail: `v${i}@example.test` },
        deps: h.deps,
      });
    }
    await expect(
      requestFuneralService({
        caller: visitor("198.51.100.5"),
        input: { contactName: "One more", contactEmail: "one-more@example.test" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });
});
