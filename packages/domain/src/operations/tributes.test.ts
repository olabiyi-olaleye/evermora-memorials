import { beforeEach, describe, expect, it } from "vitest";
import { createMemorial } from "./create-memorial";
import { editTribute } from "./edit-tribute";
import { approveTribute, hideTribute, rejectTribute } from "./moderate-tribute";
import { reportTribute } from "./report-tribute";
import { submitTribute } from "./submit-tribute";
import { updateMemorialFeatures } from "./update-memorial-features";
import { caller, harness, type Harness } from "../testing/support";

const OWNER = "a0000000-0000-4000-a000-000000000001";
const MODERATOR = "a0000000-0000-4000-a000-000000000003";
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

const visitor = (ip = "203.0.113.7") => ({
  userId: null,
  isPlatformAdmin: false,
  memorialRoles: new Map(),
  request: { ip },
});

describe("submitTribute", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("a visitor's tribute is pending when moderation is on (default)", async () => {
    const id = await seed(h);
    const res = await submitTribute({
      caller: visitor(),
      input: { memorialId: id, authorDisplayName: "Grace", message: "She taught me to read." },
      deps: h.deps,
    });
    expect(res.status).toBe("pending");
    const t = h.db.state.tributes.find((x) => x.id === res.tributeId)!;
    expect(t.status).toBe("pending");
    expect(t.publishedAt).toBeNull();
    expect(h.events.drain()[0]).toMatchObject({ name: "tribute.submitted" });
  });

  it("auto-approves when tribute_moderation_enabled is false (§37)", async () => {
    const id = await seed(h);
    await updateMemorialFeatures({
      caller: caller(OWNER),
      input: { memorialId: id, tributeModerationEnabled: false },
      deps: h.deps,
    });
    const res = await submitTribute({
      caller: visitor(),
      input: { memorialId: id, authorDisplayName: "Grace", message: "A kind soul." },
      deps: h.deps,
    });
    expect(res.status).toBe("approved");
    expect(h.db.state.tributes.find((x) => x.id === res.tributeId)!.publishedAt).not.toBeNull();
  });

  it("silently discards a honeypot hit", async () => {
    const id = await seed(h);
    const res = await submitTribute({
      caller: visitor(),
      input: {
        memorialId: id,
        authorDisplayName: "Bot",
        message: "spam",
        honeypot: "http://spam.example",
      },
      deps: h.deps,
    });
    expect(res).toEqual({ tributeId: null, status: "discarded", editToken: null });
    expect(h.db.state.tributes).toHaveLength(0);
  });

  it("sanitises HTML and control characters out of the stored text", async () => {
    const id = await seed(h);
    const res = await submitTribute({
      caller: visitor(),
      input: {
        memorialId: id,
        authorDisplayName: "  Grace <b>N</b>  ",
        message: "Line one<script>evil()</script>\nLine two",
      },
      deps: h.deps,
    });
    const t = h.db.state.tributes.find((x) => x.id === res.tributeId)!;
    expect(t.authorDisplayName).toBe("Grace N");
    expect(t.message).toBe("Line oneevil()\nLine two");
  });

  it("rate-limits repeated submissions from the same IP", async () => {
    const id = await seed(h);
    for (let i = 0; i < 3; i++) {
      await submitTribute({
        caller: visitor("198.51.100.1"),
        input: { memorialId: id, authorDisplayName: `P${i}`, message: `msg ${i}` },
        deps: h.deps,
      });
    }
    await expect(
      submitTribute({
        caller: visitor("198.51.100.1"),
        input: { memorialId: id, authorDisplayName: "P4", message: "one more" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("rejects when the memorial does not accept tributes", async () => {
    const id = await seed(h);
    await updateMemorialFeatures({
      caller: caller(OWNER),
      input: { memorialId: id, tributesEnabled: false },
      deps: h.deps,
    });
    await expect(
      submitTribute({
        caller: visitor(),
        input: { memorialId: id, authorDisplayName: "X", message: "y" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("enforces a wired CAPTCHA adapter", async () => {
    const id = await seed(h);
    h.deps.captcha = { verify: async () => false };
    await expect(
      submitTribute({
        caller: visitor(),
        input: { memorialId: id, authorDisplayName: "X", message: "y" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "precondition_failed", details: { reason: "captcha_failed" } });
  });
});

describe("editTribute", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  it("re-enters pending when moderation is on, keeping the same edit token", async () => {
    const id = await seed(h);
    const submitted = await submitTribute({
      caller: visitor(),
      input: { memorialId: id, authorDisplayName: "Grace", message: "First version." },
      deps: h.deps,
    });
    h.events.drain();

    const res = await editTribute({
      caller: visitor(),
      input: {
        editToken: submitted.editToken!,
        authorDisplayName: "Grace N",
        message: "Edited version.",
      },
      deps: h.deps,
    });
    expect(res.status).toBe("pending");
    const t = h.db.state.tributes.find((x) => x.id === submitted.tributeId)!;
    expect(t.message).toBe("Edited version.");
    expect(t.editToken).toBe(submitted.editToken);
    expect(h.events.drain()[0]).toMatchObject({ name: "tribute.edited" });
  });

  it("auto-approves an edit when tribute_moderation_enabled is false", async () => {
    const id = await seed(h);
    await updateMemorialFeatures({
      caller: caller(OWNER),
      input: { memorialId: id, tributeModerationEnabled: false },
      deps: h.deps,
    });
    const submitted = await submitTribute({
      caller: visitor(),
      input: { memorialId: id, authorDisplayName: "Grace", message: "First version." },
      deps: h.deps,
    });
    const res = await editTribute({
      caller: visitor(),
      input: { editToken: submitted.editToken!, authorDisplayName: "Grace", message: "v2" },
      deps: h.deps,
    });
    expect(res.status).toBe("approved");
    expect(
      h.db.state.tributes.find((x) => x.id === submitted.tributeId)!.publishedAt,
    ).not.toBeNull();
  });

  it("clears prior moderation stamps — a moderator re-reviews the edited text", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: MODERATOR as never,
      role: "tribute_moderator",
      status: "active",
    });
    const submitted = await submitTribute({
      caller: visitor(),
      input: { memorialId: id, authorDisplayName: "Grace", message: "First version." },
      deps: h.deps,
    });
    await approveTribute({
      caller: caller(MODERATOR),
      input: { memorialId: id, tributeId: submitted.tributeId! },
      deps: h.deps,
    });
    h.events.drain();

    await editTribute({
      caller: visitor(),
      input: { editToken: submitted.editToken!, authorDisplayName: "Grace", message: "Edited." },
      deps: h.deps,
    });
    const t = h.db.state.tributes.find((x) => x.id === submitted.tributeId)!;
    expect(t.status).toBe("pending");
    expect(t.moderatedBy).toBeNull();
    expect(t.moderationNote).toBeNull();
  });

  it("sanitises HTML and control characters out of an edit, same as submit", async () => {
    const id = await seed(h);
    const submitted = await submitTribute({
      caller: visitor(),
      input: { memorialId: id, authorDisplayName: "Grace", message: "First version." },
      deps: h.deps,
    });
    await editTribute({
      caller: visitor(),
      input: {
        editToken: submitted.editToken!,
        authorDisplayName: "  Grace <b>N</b>  ",
        message: "Line one<script>evil()</script>\nLine two",
      },
      deps: h.deps,
    });
    const t = h.db.state.tributes.find((x) => x.id === submitted.tributeId)!;
    expect(t.authorDisplayName).toBe("Grace N");
    expect(t.message).toBe("Line oneevil()\nLine two");
  });

  it("rejects an unknown or already-wrong edit token", async () => {
    await seed(h);
    await expect(
      editTribute({
        caller: visitor(),
        input: {
          editToken: "99999999-1111-4111-8111-111111111111",
          authorDisplayName: "Nobody",
          message: "not mine",
        },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("tribute moderation", () => {
  let h: Harness;
  beforeEach(() => {
    h = harness({
      ids: Array.from(
        { length: 20 },
        (_, i) => `${(i % 10).toString().repeat(8)}-1111-4111-8111-111111111111`,
      ),
    });
  });

  async function pendingTribute(h2: Harness, memorialId: string): Promise<string> {
    const r = await submitTribute({
      caller: visitor(),
      input: { memorialId, authorDisplayName: "Grace", message: "Kind words." },
      deps: h2.deps,
    });
    h2.events.drain();
    return r.tributeId!;
  }

  it("a moderator approves a pending tribute → published", async () => {
    const id = await seed(h);
    h.db.state.memberships.push({
      memorialId: id as never,
      profileId: MODERATOR as never,
      role: "tribute_moderator",
      status: "active",
    });
    const tid = await pendingTribute(h, id);
    const res = await approveTribute({
      caller: caller(MODERATOR),
      input: { memorialId: id, tributeId: tid },
      deps: h.deps,
    });
    expect(res.status).toBe("approved");
    const t = h.db.state.tributes.find((x) => x.id === tid)!;
    expect(t.publishedAt).not.toBeNull();
    expect(t.moderatedBy).toBe(MODERATOR);
    expect(h.events.drain()[0]).toMatchObject({ name: "tribute.approved" });
  });

  it("a non-moderator cannot moderate", async () => {
    const id = await seed(h);
    const tid = await pendingTribute(h, id);
    await expect(
      rejectTribute({
        caller: caller(STRANGER),
        input: { memorialId: id, tributeId: tid },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects an invalid transition (reject an already-approved tribute)", async () => {
    const id = await seed(h);
    const tid = await pendingTribute(h, id);
    await approveTribute({
      caller: caller(OWNER),
      input: { memorialId: id, tributeId: tid },
      deps: h.deps,
    });
    h.events.drain();
    await expect(
      rejectTribute({
        caller: caller(OWNER),
        input: { memorialId: id, tributeId: tid },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "conflict", details: { reason: "invalid_transition" } });
  });

  it("hide takes an approved tribute out of public view", async () => {
    const id = await seed(h);
    const tid = await pendingTribute(h, id);
    await approveTribute({
      caller: caller(OWNER),
      input: { memorialId: id, tributeId: tid },
      deps: h.deps,
    });
    h.events.drain();
    const res = await hideTribute({
      caller: caller(OWNER),
      input: { memorialId: id, tributeId: tid },
      deps: h.deps,
    });
    expect(res.status).toBe("hidden");
    expect(h.db.state.tributes.find((x) => x.id === tid)!.publishedAt).toBeNull();
  });

  it("reportTribute writes a report and audits it", async () => {
    const id = await seed(h);
    const tid = await pendingTribute(h, id);
    const res = await reportTribute({
      caller: visitor(),
      input: { memorialId: id, tributeId: tid, reason: "abuse", details: "Not appropriate." },
      deps: h.deps,
    });
    expect(res.reportId).toBeTruthy();
    expect(h.db.state.reports[0]).toMatchObject({ tributeId: tid, reason: "abuse" });
    expect(h.db.state.audit.some((a) => a.action === "memorial.reported")).toBe(true);
  });

  it("reportTribute rate-limits repeated reports from the same IP (Phase 5O)", async () => {
    const id = await seed(h);
    const tid = await pendingTribute(h, id);
    for (let i = 0; i < 10; i++) {
      await reportTribute({
        caller: visitor("198.51.100.9"),
        input: { memorialId: id, tributeId: tid, reason: "abuse" },
        deps: h.deps,
      });
    }
    await expect(
      reportTribute({
        caller: visitor("198.51.100.9"),
        input: { memorialId: id, tributeId: tid, reason: "abuse" },
        deps: h.deps,
      }),
    ).rejects.toMatchObject({ code: "rate_limited" });
  });
});
