import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { publishFamilyUpdate } from "./family-update-lifecycle";
import { inviteMemorialAdmin } from "./invite-memorial-admin";
import { listMyNotifications, markNotificationsRead } from "./notifications";
import { reportTribute } from "./report-tribute";
import { saveFamilyUpdate } from "./save-family-update";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const MEMBER = "a0000000-0000-4000-a000-000000000002";
const STAFF = "a0000000-0000-4000-a000-0000000000ff";

async function seed(h: Harness): Promise<string> {
  const res = await createMemorial({
    caller: caller(OWNER),
    input: { fullName: "Josephine Okafor", slug: "josephine-okafor" },
    deps: h.deps,
  });
  h.db.state.memberships.push({
    memorialId: res.memorialId as never,
    profileId: MEMBER as never,
    role: "content_editor",
    status: "active",
  });
  h.events.drain();
  return res.memorialId;
}

describe("notifications", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 30 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("lists the recipient's in-app notifications and marks them read", async () => {
    h.db.state.notifications.push(
      {
        id: "n1",
        recipientProfileId: OWNER,
        recipientEmail: null,
        memorialId: null,
        eventType: "family_update_published",
        channel: "in_app",
        payload: { title: "A" },
        readAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
      },
      {
        id: "n2",
        recipientProfileId: OWNER,
        recipientEmail: null,
        memorialId: null,
        eventType: "tribute_submitted",
        channel: "in_app",
        payload: {},
        readAt: null,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
      {
        id: "n3",
        recipientProfileId: MEMBER,
        recipientEmail: null,
        memorialId: null,
        eventType: "tribute_submitted",
        channel: "in_app",
        payload: {},
        readAt: null,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
      {
        id: "n4",
        recipientProfileId: OWNER,
        recipientEmail: null,
        memorialId: null,
        eventType: "admin_invited",
        channel: "email",
        payload: {},
        readAt: null,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
    );

    const listed = await listMyNotifications({ caller: caller(OWNER), deps: h.deps });
    // only the owner's in_app rows; email + other recipients excluded
    expect(listed.notifications.map((n) => n.id)).toEqual(["n2", "n1"]);
    expect(listed.unread).toBe(2);

    await markNotificationsRead({ caller: caller(OWNER), input: { ids: ["n1"] }, deps: h.deps });
    expect((await listMyNotifications({ caller: caller(OWNER), deps: h.deps })).unread).toBe(1);

    await markNotificationsRead({ caller: caller(OWNER), input: { all: true }, deps: h.deps });
    expect((await listMyNotifications({ caller: caller(OWNER), deps: h.deps })).unread).toBe(0);
    // the other recipient is untouched
    expect(h.db.state.notifications.find((n) => n.id === "n3")!.readAt).toBeNull();
  });

  it("rejects an anonymous caller", async () => {
    await expect(listMyNotifications({ caller: caller(null), deps: h.deps })).rejects.toMatchObject(
      { code: "unauthenticated" },
    );
  });

  it("notifies the other active members when a family update is published", async () => {
    const id = await seed(h);
    const { update } = await saveFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, title: "Thank you", body: "We are grateful." },
      deps: h.deps,
    });
    h.events.drain();

    await publishFamilyUpdate({
      caller: caller(OWNER),
      input: { memorialId: id, updateId: update.id },
      deps: h.deps,
    });

    const forMember = h.db.state.notifications.filter((n) => n.recipientProfileId === MEMBER);
    expect(forMember).toHaveLength(1);
    expect(forMember[0]).toMatchObject({
      eventType: "family_update_published",
      channel: "in_app",
      memorialId: id,
    });
    // the actor does not notify themselves
    expect(h.db.state.notifications.some((n) => n.recipientProfileId === OWNER)).toBe(false);
  });

  it("notifies platform staff when a tribute is reported", async () => {
    const id = await seed(h);
    h.db.state.platformAdminIds = [STAFF];

    await reportTribute({
      caller: caller(MEMBER),
      input: {
        memorialId: id,
        tributeId: "abababab-abab-4aba-8aba-abababababab",
        reason: "abuse",
      },
      deps: h.deps,
    });

    const forStaff = h.db.state.notifications.filter((n) => n.recipientProfileId === STAFF);
    expect(forStaff).toHaveLength(1);
    expect(forStaff[0]).toMatchObject({ eventType: "memorial_reported", channel: "in_app" });
  });

  it("records an email-channel notification for a pre-account invitee", async () => {
    const id = await seed(h);
    await inviteMemorialAdmin({
      caller: caller(OWNER),
      input: { memorialId: id, email: "Aunt.Grace@example.test", role: "content_editor" },
      deps: h.deps,
    });

    const emailed = h.db.state.notifications.filter((n) => n.channel === "email");
    expect(emailed).toHaveLength(1);
    expect(emailed[0]).toMatchObject({
      recipientEmail: "aunt.grace@example.test",
      recipientProfileId: null,
      eventType: "admin_invited",
    });
    // an email-channel row is never returned by the in-app centre
    h.db.state.notifications.push({
      id: "x",
      recipientProfileId: OWNER,
      recipientEmail: null,
      memorialId: null,
      eventType: "admin_invited",
      channel: "email",
      payload: {},
      readAt: null,
      createdAt: "2026-09-02T00:00:00.000Z",
    });
    const listed = await listMyNotifications({ caller: caller(OWNER), deps: h.deps });
    expect(listed.notifications).toHaveLength(0);
  });
});
