import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { generateShareAsset } from "./generate-share-asset";
import { retireShareAsset } from "./retire-share-asset";
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

describe("share assets", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("mints a permanent, unguessable resolver and records it", async () => {
    const id = await seed(h);
    const res = await generateShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id, label: "Funeral programme", medium: "funeral_programme" },
      deps: h.deps,
    });
    expect(res.shareResolver.token).toMatch(/^[a-f0-9]{12,}$/);
    expect(res.shareResolver.isActive).toBe(true);
    expect(res.shareResolver.medium).toBe("funeral_programme");
    expect(h.events.drain()[0]).toMatchObject({ name: "share_asset.generated" });
    expect(h.db.state.audit.some((a) => a.action === "share_asset.generated")).toBe(true);
  });

  it("gives each call a distinct token (a print run)", async () => {
    const id = await seed(h);
    const a = await generateShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id },
      deps: h.deps,
    });
    const b = await generateShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id },
      deps: h.deps,
    });
    expect(a.shareResolver.token).not.toBe(b.shareResolver.token);
  });

  it("refuses when QR codes are turned off", async () => {
    const id = await seed(h);
    h.db.state.feature.get(id)!.qrCodeEnabled = false;
    await expect(
      generateShareAsset({ caller: caller(OWNER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "precondition_failed", details: { reason: "qr_disabled" } });
  });

  it("forbids a caller without memorial.edit", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "tribute_moderator",
      status: "active",
    });
    await expect(
      generateShareAsset({ caller: caller(STRANGER), input: { memorialId: id }, deps: h.deps }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("retires a resolver without deleting it; retiring twice is a no-op", async () => {
    const id = await seed(h);
    const res = await generateShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id },
      deps: h.deps,
    });
    h.events.drain();

    await retireShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id, shareResolverId: res.shareResolver.id },
      deps: h.deps,
    });
    const row = h.db.state.shareResolvers.find((r) => r.id === res.shareResolver.id)!;
    expect(row.isActive).toBe(false);
    expect(row.retiredAt).not.toBeNull();
    expect(h.db.state.audit.some((a) => a.action === "share_asset.retired")).toBe(true);

    const auditCount = h.db.state.audit.length;
    await retireShareAsset({
      caller: caller(OWNER),
      input: { memorialId: id, shareResolverId: res.shareResolver.id },
      deps: h.deps,
    });
    expect(h.db.state.audit.length).toBe(auditCount); // no second audit row
  });
});
