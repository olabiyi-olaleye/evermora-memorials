import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { sanitizeLine, sanitizePlainText } from "@evermora/utils";
import type { CallerContext } from "../context";
import {
  ForbiddenError,
  MemorialNotFoundError,
  PreconditionFailedError,
  RateLimitedError,
  ValidationError,
} from "../errors";
import type { OperationDeps } from "./deps";
import { notifyMemorialMembers } from "./notify";

/**
 * submitTribute — contract: `docs/domain/operations/submit-tribute.md`.
 *
 * A visitor (no account) leaves a written tribute. New tributes are `pending`
 * and appear only after a family moderator approves them — UNLESS the memorial
 * has `tribute_moderation_enabled = false`, in which case a valid tribute
 * becomes `approved` immediately (adopted MVP decision, architecture spec §37).
 *
 * MVP anti-abuse (architecture spec §36): a hidden honeypot field, a per-IP rate
 * limit, length limits, and plain-text sanitisation. A CAPTCHA provider is
 * **deferred** — if `deps.captcha` is absent the challenge is not enforced
 * (this is not "bot protection complete").
 */

const RATE_WINDOW_MINUTES = 10;
const RATE_MAX_PER_WINDOW = 3;

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  authorDisplayName: z.string().min(1).max(400),
  authorRelationship: z.string().max(200).optional(),
  authorEmail: z.string().email().max(320).optional().or(z.literal("")),
  message: z.string().min(1).max(8000),
  /** Hidden field — real people never fill it; bots often do. */
  honeypot: z.string().optional(),
  captchaToken: z.string().optional(),
});

export type SubmitTributeInput = z.input<typeof InputSchema>;

export interface SubmitTributeResult {
  /** null when the submission was silently discarded (honeypot). */
  tributeId: string | null;
  status: "pending" | "approved" | "discarded";
  /**
   * The visitor's only proof of authorship — null when discarded. The caller
   * stores this (e.g. localStorage) to offer "edit your tribute" later;
   * Evermora never shows or emails it back another way.
   */
  editToken: string | null;
}

export async function submitTribute(params: {
  caller: CallerContext;
  input: SubmitTributeInput;
  deps: OperationDeps;
}): Promise<SubmitTributeResult> {
  const { caller, deps } = params;

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("Please check the tribute and try again.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;

  // Honeypot: pretend success, write nothing.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return { tributeId: null, status: "discarded", editToken: null };
  }

  const memorialId = input.memorialId as MemorialId;
  const authorDisplayName = sanitizeLine(input.authorDisplayName);
  const authorRelationship = input.authorRelationship
    ? sanitizeLine(input.authorRelationship)
    : null;
  const message = sanitizePlainText(input.message);
  const authorEmail = input.authorEmail ? input.authorEmail.toLowerCase() : null;

  if (authorDisplayName.length < 1 || authorDisplayName.length > 120) {
    throw new ValidationError("Enter a name between 1 and 120 characters.", {
      reason: "name_length",
    });
  }
  if (message.length < 1 || message.length > 5000) {
    throw new ValidationError("Your message needs to be between 1 and 5000 characters.", {
      reason: "message_length",
    });
  }
  if (authorRelationship && authorRelationship.length > 120) {
    throw new ValidationError("That relationship description is too long.", {
      reason: "relationship_length",
    });
  }

  // CAPTCHA — only enforced when a provider adapter is wired.
  if (deps.captcha) {
    const ok = await deps.captcha.verify(input.captchaToken, "submit_tribute");
    if (!ok) {
      throw new PreconditionFailedError("Please complete the verification and try again.", {
        reason: "captcha_failed",
      });
    }
  }

  const ip = caller.request?.ip ?? null;
  const now = deps.clock.now();

  return deps.unitOfWork.transaction(caller, async (repos) => {
    // Memorial must exist, be readable, and accept tributes.
    const feature = await repos.settings.feature(memorialId);
    const memorial = await repos.memorials.findById(memorialId);
    if (!feature || !memorial || memorial.deletedAt) {
      // `findById` is RLS-scoped for `anon`; a private / unpublished memorial reads null.
      throw new MemorialNotFoundError();
    }
    if (!feature.tributesEnabled) {
      throw new ForbiddenError("This memorial isn't accepting tributes right now.");
    }

    // Per-IP rate limit (best effort — a shared DB count, so it works serverless).
    if (ip) {
      const since = new Date(now.getTime() - RATE_WINDOW_MINUTES * 60_000).toISOString();
      const recent = await repos.tributes.recentFromIp(memorialId, ip, since);
      if (recent >= RATE_MAX_PER_WINDOW) {
        throw new RateLimitedError();
      }
    }

    const autoApprove = !feature.tributeModerationEnabled;
    const status = autoApprove ? "approved" : "pending";

    const tribute = await repos.tributes.create({
      id: deps.ids.newId(),
      memorialId,
      status,
      authorDisplayName,
      authorRelationship,
      authorEmail,
      message,
      mediaId: null,
      editToken: deps.ids.newId(),
      submittedIp: ip,
      submittedUserAgent: caller.request?.userAgent ?? null,
      publishedAt: autoApprove ? now.toISOString() : null,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.userId ? "user" : "anonymous",
      action: "tribute.submitted",
      entityType: "tribute",
      entityId: tribute.id,
      memorialId,
      metadata: { autoApproved: autoApprove },
    });
    deps.events.record("tribute.submitted", {
      memorialId,
      tributeId: tribute.id,
      autoApproved: autoApprove,
    });
    if (!autoApprove) {
      await notifyMemorialMembers(repos, deps, caller, {
        memorialId,
        eventType: "tribute_submitted",
        payload: { tributeId: tribute.id, authorDisplayName: tribute.authorDisplayName },
      });
    }

    return { tributeId: tribute.id, status, editToken: tribute.editToken };
  });
}
