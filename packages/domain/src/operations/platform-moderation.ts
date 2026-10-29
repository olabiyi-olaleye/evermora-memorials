import { z } from "zod";
import {
  REPORT_STATUS,
  SERVICE_REQUEST_STATUS,
  type MemorialId,
  type ProfileId,
} from "@evermora/types";
import { sanitizePlainText } from "@evermora/utils";
import { isAuthenticated, type CallerContext } from "../context";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { ReportRow, ServiceRequestRow } from "../ports/rows";
import type { OperationDeps } from "./deps";

/**
 * Platform-staff moderation operations (Phase 5M).
 *
 * `setMemorialModeration` · `resolveReport` · `updateServiceRequest` — all
 * gated on `caller.isPlatformAdmin` (RLS re-checks `app.is_platform_admin()`
 * underneath; the `memorials_guard_lifecycle` trigger backstops suspension).
 */

function requirePlatformAdmin(caller: CallerContext): asserts caller is CallerContext {
  if (!isAuthenticated(caller)) throw new UnauthenticatedError("Sign in to the admin console.");
  if (!caller.isPlatformAdmin) throw new ForbiddenError("Platform staff only.");
}

// --- setMemorialModeration -----------------------------------------

const ModerationInput = z.object({
  memorialId: z.string().uuid(),
  action: z.enum(["suspend", "restore"]),
  reason: z
    .string()
    .transform((s) => sanitizePlainText(s))
    .pipe(z.string().max(1000))
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional(),
});
export type SetMemorialModerationInput = z.input<typeof ModerationInput>;

export async function setMemorialModeration(params: {
  caller: CallerContext;
  input: SetMemorialModerationInput;
  deps: OperationDeps;
}): Promise<{ memorialId: string; status: string }> {
  const { caller, deps } = params;
  requirePlatformAdmin(caller);
  const parsed = ModerationInput.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;
  const { action, reason } = parsed.data;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) throw new NotFoundError("That memorial does not exist.");

    if (action === "suspend") {
      if (memorial.status === "suspended") {
        return { memorialId, status: "suspended" };
      }
      const now = deps.clock.now().toISOString();
      const updated = await repos.memorials.setStatus(memorialId, {
        status: "suspended",
        suspendedAt: now,
        suspendedReason: reason ?? null,
      });
      await audit(repos, caller, memorialId, "memorial.suspended", { reason });
      return { memorialId, status: updated.status };
    }

    // restore
    if (memorial.status !== "suspended") {
      throw new ConflictError("That memorial is not suspended.", { reason: "not_suspended" });
    }
    const restoredTo = memorial.publishedAt ? "published" : "draft";
    const updated = await repos.memorials.setStatus(memorialId, {
      status: restoredTo,
      suspendedAt: null,
      suspendedReason: null,
    });
    await audit(repos, caller, memorialId, "memorial.restored", { restoredTo });
    return { memorialId, status: updated.status };
  });
}

// --- resolveReport ------------------------------------------------

const ReportInput = z.object({
  reportId: z.string().min(1),
  status: z.enum(REPORT_STATUS),
  note: z
    .string()
    .transform((s) => sanitizePlainText(s))
    .pipe(z.string().max(2000))
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional(),
});
export type ResolveReportInput = z.input<typeof ReportInput>;

export async function resolveReport(params: {
  caller: CallerContext;
  input: ResolveReportInput;
  deps: OperationDeps;
}): Promise<{ report: ReportRow }> {
  const { caller, deps } = params;
  requirePlatformAdmin(caller);
  const parsed = ReportInput.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const { reportId, status, note } = parsed.data;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const report = await repos.reports.findById(reportId);
    if (!report) throw new NotFoundError("That report does not exist.");

    const terminal = status === "actioned" || status === "dismissed";
    const now = deps.clock.now().toISOString();
    const updated = await repos.reports.resolve(reportId, {
      status,
      resolvedBy: terminal ? (caller.userId as ProfileId) : null,
      resolvedAt: terminal ? now : null,
      resolutionNote: note ?? report.resolutionNote,
    });
    await auditFree(repos, caller, report.memorialId, "report", reportId, "report.reviewed", {
      status,
    });
    return { report: updated };
  });
}

// --- updateServiceRequest ---------------------------------------

const ServiceInput = z.object({
  requestId: z.string().min(1),
  status: z.enum(SERVICE_REQUEST_STATUS).optional(),
  assignToMe: z.boolean().optional(),
  unassign: z.boolean().optional(),
  internalNote: z
    .string()
    .transform((s) => sanitizePlainText(s))
    .pipe(z.string().max(4000))
    .nullable()
    .optional(),
});
export type UpdateServiceRequestInput = z.input<typeof ServiceInput>;

export async function updateServiceRequest(params: {
  caller: CallerContext;
  input: UpdateServiceRequestInput;
  deps: OperationDeps;
}): Promise<{ request: ServiceRequestRow }> {
  const { caller, deps } = params;
  requirePlatformAdmin(caller);
  const parsed = ServiceInput.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const { requestId, status, assignToMe, unassign, internalNote } = parsed.data;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const request = await repos.serviceRequests.findById(requestId);
    if (!request) throw new NotFoundError("That request does not exist.");

    const patch: {
      status?: (typeof SERVICE_REQUEST_STATUS)[number];
      assignedTo?: string | null;
      internalNotes?: string | null;
      resolvedAt?: string | null;
    } = {};
    if (status && status !== request.status) patch.status = status;
    if (assignToMe) patch.assignedTo = caller.userId as string;
    else if (unassign) patch.assignedTo = null;
    if (internalNote !== undefined) patch.internalNotes = internalNote;
    if (status === "completed" || status === "declined" || status === "cancelled") {
      patch.resolvedAt = deps.clock.now().toISOString();
    }
    if (Object.keys(patch).length === 0) {
      throw new ConflictError("Nothing to change.", { reason: "no_change" });
    }

    const updated = await repos.serviceRequests.update(requestId, patch);
    await auditFree(
      repos,
      caller,
      request.memorialId,
      "service_request",
      requestId,
      "service_request.updated",
      { status: updated.status },
    );
    return { request: updated };
  });
}

// --- helpers ---------------------------------------------------

type Repos = Parameters<Parameters<OperationDeps["unitOfWork"]["transaction"]>[1]>[0];

async function audit(
  repos: Repos,
  caller: CallerContext,
  memorialId: MemorialId,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await repos.audit.record({
    actorProfileId: caller.userId,
    actorKind: "platform_admin",
    action,
    entityType: "memorial",
    entityId: memorialId,
    memorialId,
    metadata,
  });
}

async function auditFree(
  repos: Repos,
  caller: CallerContext,
  memorialId: string | null,
  entityType: string,
  entityId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await repos.audit.record({
    actorProfileId: caller.userId,
    actorKind: "platform_admin",
    action,
    entityType,
    entityId,
    memorialId: memorialId as MemorialId | null,
    metadata,
  });
}
