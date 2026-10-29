import { z } from "zod";
import { SERVICE_REQUEST_TYPE, type MemorialId, type ProfileId } from "@evermora/types";
import { sanitizeLine, sanitizePlainText } from "@evermora/utils";
import type { CallerContext } from "../context";
import { NotFoundError, RateLimitedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { notifyPlatformStaff } from "./notify";

/**
 * requestFuneralService — contract:
 * `docs/domain/operations/request-funeral-service.md`.
 *
 * Anyone (including an anonymous visitor) asks Evermora for a facilitated
 * service. Writes a `service_requests` row as `status='new'`, unassigned, and
 * routes it to platform staff. May arrive **before** a memorial exists.
 * Per-IP rate limited (Phase 5O), global — a request has no `memorial_id` to
 * scope by when none exists yet.
 */

const RATE_WINDOW_MINUTES = 30;
const RATE_MAX_PER_WINDOW = 5;

const InputSchema = z.object({
  memorialId: z.string().uuid().nullable().optional(),
  contactName: z
    .string()
    .transform((s) => sanitizeLine(s))
    .pipe(z.string().min(1, "Your name is required.").max(160)),
  contactEmail: z.string().trim().toLowerCase().email("Enter a valid email.").max(320),
  contactPhone: z
    .string()
    .transform((s) => sanitizeLine(s))
    .pipe(z.string().max(60))
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional(),
  serviceType: z.enum(SERVICE_REQUEST_TYPE).default("other"),
  details: z
    .string()
    .transform((s) => sanitizePlainText(s))
    .pipe(z.string().max(4000))
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional(),
  /** Honeypot — a bot fills this; a human never sees it. */
  website: z.string().optional(),
});

export type RequestFuneralServiceInput = z.input<typeof InputSchema>;

export interface RequestFuneralServiceResult {
  serviceRequestId: string;
  status: "new";
  discarded?: boolean;
}

export async function requestFuneralService(params: {
  caller: CallerContext;
  input: RequestFuneralServiceInput;
  deps: OperationDeps;
}): Promise<RequestFuneralServiceResult> {
  const { caller, deps } = params;
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("Please check the form and try again.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;

  // Honeypot: silently accept but drop it (don't tell the bot).
  if (input.website && input.website.length > 0) {
    return { serviceRequestId: deps.ids.newId(), status: "new", discarded: true };
  }

  const requestedMemorialId = (input.memorialId ?? null) as MemorialId | null;
  const ip = caller.request?.ip ?? null;
  const now = deps.clock.now();

  return deps.unitOfWork.transaction(caller, async (repos) => {
    if (ip) {
      const since = new Date(now.getTime() - RATE_WINDOW_MINUTES * 60_000).toISOString();
      const recent = await repos.serviceRequests.recentFromIp(ip, since);
      if (recent >= RATE_MAX_PER_WINDOW) throw new RateLimitedError();
    }

    // Attach the memorial only if the caller can actually see it (RLS). A
    // non-member friend requesting on a public memorial's behalf still works;
    // a private-memorial id from a stranger is simply not attached.
    let memorialId: MemorialId | null = null;
    if (requestedMemorialId) {
      const memorial = await repos.memorials.findById(requestedMemorialId);
      if (memorial?.deletedAt) throw new NotFoundError("That memorial does not exist.");
      if (memorial) memorialId = requestedMemorialId;
    }

    const { id } = await repos.serviceRequests.create({
      id: deps.ids.newId(),
      memorialId,
      requestedBy: (caller.userId as ProfileId | null) ?? null,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      serviceType: input.serviceType,
      details: input.details ?? null,
      submittedIp: ip,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.userId ? "user" : "anonymous",
      action: "service_request.created",
      entityType: "service_request",
      entityId: id,
      memorialId,
      metadata: { serviceType: input.serviceType },
    });
    deps.events.record("service_request.created", {
      serviceRequestId: id,
      serviceType: input.serviceType,
    });
    await notifyPlatformStaff(repos, deps, caller, {
      memorialId,
      eventType: "service_request_received",
      payload: {
        serviceRequestId: id,
        serviceType: input.serviceType,
        contactName: input.contactName,
      },
    });

    return { serviceRequestId: id, status: "new" };
  });
}
