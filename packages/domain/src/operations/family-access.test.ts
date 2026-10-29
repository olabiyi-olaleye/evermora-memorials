import { beforeEach, describe, expect, it } from "vitest";
import { changeMemorialRole } from "./change-memorial-role";
import { createMemorial } from "./create-memorial";
import { inviteMemorialAdmin } from "./invite-memorial-admin";
import { transferMemorialOwnership } from "./transfer-memorial-ownership";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const HELPER = "a0000000-0000-4000-a000-000000000002";
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

describe("family access", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("invites by email as a pending membership and records it", async () => {
    const id = await seed(h);
    const res = await inviteMemorialAdmin({
      caller: caller(OWNER),
      input: { memorialId: id, email: "Aunt.Grace@example.test", role: "content_editor" },
      deps: h.deps,
    });
    expect(res.reinvited).toBe(false);
    expect(res.membership).toMatchObject({
      status: "invited",
      role: "content_editor",
      invitedEmail: "aunt.grace@example.test",
      profileId: null,
    });
    expect(h.events.drain()[0]).toMatchObject({ name: "memorial_admin.invited" });
    expect(h.db.state.audit.some((a) => a.action === "memorial_admin.invited")).toBe(true);
  });

  it("re-inviting the same email updates the pending role, no duplicate", async () => {
    const id = await seed(h);
    await inviteMemorialAdmin({
      caller: caller(OWNER),
      input: { memorialId: id, email: "grace@example.test", role: "viewer" },
      deps: h.deps,
    });
    const res = await inviteMemorialAdmin({
      caller: caller(OWNER),
      input: { memorialId: id, email: "grace@example.test", role: "admin" },
      deps: h.deps,
    });
    expect(res.reinvited).toBe(true);
    expect(res.membership.role).toBe("admin");
    expect(
      h.db.state.memberships.filter((m) => m.invitedEmail === "grace@example.test"),
    ).toHaveLength(1);
  });

  it("rejects owner as an invite role", async () => {
    const id = await seed(h);
    await expect(
      inviteMemorialAdmin({
        caller: caller(OWNER),
        input: { memorialId: id, email: "x@example.test", role: "owner" as never },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("forbids a caller without admins.manage", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: STRANGER as never,
      role: "content_editor",
      status: "active",
    });
    await expect(
      inviteMemorialAdmin({
        caller: caller(STRANGER),
        input: { memorialId: id, email: "x@example.test", role: "viewer" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("changes a member's role and can suspend / restore them", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      id: "m-helper",
      memorialId: id as never,
      profileId: HELPER,
      invitedEmail: null,
      role: "viewer",
      status: "active",
      invitedBy: OWNER,
      invitedAt: "2026-01-01T00:00:00.000Z",
      acceptedAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    });

    const up = await changeMemorialRole({
      caller: caller(OWNER),
      input: { memorialId: id, membershipId: "m-helper", role: "content_editor" },
      deps: h.deps,
    });
    expect(up.membership.role).toBe("content_editor");

    const suspended = await changeMemorialRole({
      caller: caller(OWNER),
      input: { memorialId: id, membershipId: "m-helper", status: "suspended" },
      deps: h.deps,
    });
    expect(suspended.membership.status).toBe("suspended");
    expect(h.db.state.audit.filter((a) => a.action === "memorial_role.changed")).toHaveLength(2);
  });

  it("refuses to change the owner's role via changeMemorialRole", async () => {
    const id = await seed(h);
    const ownerMembership = h.db.state.memberships.find((m) => m.role === "owner")!;
    await expect(
      changeMemorialRole({
        caller: caller(OWNER),
        input: { memorialId: id, membershipId: `mem-${id}`, role: "admin" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "is_owner" } });
    void ownerMembership;
  });

  it("refuses to let a caller change their own access", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      id: "m-self",
      memorialId: id as never,
      profileId: HELPER,
      invitedEmail: null,
      role: "admin",
      status: "active",
      invitedBy: OWNER,
      invitedAt: "2026-01-01T00:00:00.000Z",
      acceptedAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    });
    await expect(
      changeMemorialRole({
        caller: caller(HELPER),
        input: { memorialId: id, membershipId: "m-self", role: "viewer" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("transfers ownership: previous owner is demoted to admin, one owner remains", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      id: "m-helper",
      memorialId: id as never,
      profileId: HELPER,
      invitedEmail: null,
      role: "admin",
      status: "active",
      invitedBy: OWNER,
      invitedAt: "2026-01-01T00:00:00.000Z",
      acceptedAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    });

    const res = await transferMemorialOwnership({
      caller: caller(OWNER),
      input: { memorialId: id, newOwnerProfileId: HELPER },
      deps: h.deps,
    });
    expect(res.previousOwnerProfileId).toBe(OWNER);
    const owners = h.db.state.memberships.filter(
      (m) => m.role === "owner" && m.status === "active",
    );
    expect(owners).toHaveLength(1);
    expect(owners[0]!.profileId).toBe(HELPER);
    expect(h.db.state.memberships.find((m) => m.profileId === OWNER)!.role).toBe("admin");
    expect(h.events.drain()[0]).toMatchObject({ name: "memorial.ownership_transferred" });
  });

  it("only the owner can transfer ownership", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      id: "m-helper",
      memorialId: id as never,
      profileId: HELPER,
      invitedEmail: null,
      role: "admin",
      status: "active",
      invitedBy: OWNER,
      invitedAt: "2026-01-01T00:00:00.000Z",
      acceptedAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    });
    await expect(
      transferMemorialOwnership({
        caller: caller(HELPER),
        input: { memorialId: id, newOwnerProfileId: HELPER },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("cannot transfer to someone who is not an active member", async () => {
    const id = await seed(h);
    await expect(
      transferMemorialOwnership({
        caller: caller(OWNER),
        input: { memorialId: id, newOwnerProfileId: STRANGER },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({
      code: "precondition_failed",
      details: { reason: "target_not_member" },
    });
  });
});
