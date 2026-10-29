import { z } from "zod";
import { REPORT_REASON, type MemorialId, type ProfileId } from "@evermora/types";
import { sanitizePlainText } from "@evermora/utils";
import type { CallerContext } from "../context";
import { NotFoundError, RateLimitedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { notifyPlatformStaff } from "./notify";

/**
 * reportTribute — anyone (incl. a visitor with no account) flags a tribute for
 * platform review. Writes a `reports` row; the tribute is untouched (a family
 * moderator or platform staff decides what happens). A report is a safety
 * valve, so the per-IP limit (Phase 5O) is deliberately generous — global
 * across memorials, not per-memorial — wide enough that someone raising a
 * handful of genuine concerns is never blocked, tight enough to stop
 * automated flooding of the moderation queue. The input is also
 * length-bounded and sanitised.
 */

const RATE_WINDOW_MINUTES = 15;
const RATE_MAX_PER_WINDOW = 10;

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  tributeId: z.string().uuid(),
  reason: z.enum(REPORT_REASON).default("other"),
  details: z.string().max(4000).optional(),
  reporterEmail: z.string().email().max(320).optional().or(z.literal("")),
});

export type ReportTributeInput = z.input<typeof InputSchema>;

export async function reportTribute(params: {
  caller: CallerContext;
  input: ReportTributeInput;
  deps: OperationDeps;
}): Promise<{ reportId: string }> {
  const { caller, deps } = params;
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid report.", { reason: "invalid_input" });
  const input = parsed.data;
  const memorialId = input.memorialId as MemorialId;
  const ip = caller.request?.ip ?? null;
  const now = deps.clock.now();

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) throw new NotFoundError("That memorial does not exist.");

    if (ip) {
      const since = new Date(now.getTime() - RATE_WINDOW_MINUTES * 60_000).toISOString();
      const recent = await repos.reports.recentFromIp(ip, since);
      if (recent >= RATE_MAX_PER_WINDOW) throw new RateLimitedError();
    }

    const { id } = await repos.reports.create({
      id: deps.ids.newId(),
      memorialId,
      tributeId: input.tributeId,
      reporterProfileId: (caller.userId as ProfileId | null) ?? null,
      reporterEmail: input.reporterEmail ? input.reporterEmail.toLowerCase() : null,
      reason: input.reason,
      details: input.details ? sanitizePlainText(input.details).slice(0, 4000) : null,
      submittedIp: ip,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.userId ? "user" : "anonymous",
      action: "memorial.reported",
      entityType: "report",
      entityId: id,
      memorialId,
      metadata: { tributeId: input.tributeId, reason: input.reason },
    });
    deps.events.record("memorial.reported", { memorialId, reportId: id });
    await notifyPlatformStaff(repos, deps, caller, {
      memorialId,
      eventType: "memorial_reported",
      payload: { reportId: id, reason: input.reason, tributeId: input.tributeId },
    });

    return { reportId: id };
  });
}
