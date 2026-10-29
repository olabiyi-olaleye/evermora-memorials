import { z } from "zod";
import { sanitizeLine, sanitizePlainText } from "@evermora/utils";
import type { CallerContext } from "../context";
import { NotFoundError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { notifyMemorialMembers } from "./notify";

/**
 * editTribute — contract mirrors `submitTribute` (`docs/domain/operations/`).
 *
 * A visitor edits their own tribute, proven only by the private `editToken`
 * `submitTribute` handed back once. There is no account, so this is the only
 * proof of authorship — `repos.tributes.findByEditToken` / `editByToken` are
 * backed by a SECURITY DEFINER RPC (`resolve_tribute_edit_token` /
 * `apply_tribute_edit`) since RLS has no concept of "anonymous token
 * ownership". An edit re-enters moderation exactly like a fresh submission
 * (architecture spec §37's auto-approve rule applies identically) — a moderator
 * reviewing an approved tribute should never be looking at stale content the
 * visitor has since changed.
 */

const InputSchema = z.object({
  editToken: z.string().uuid(),
  authorDisplayName: z.string().min(1).max(400),
  authorRelationship: z.string().max(200).optional(),
  message: z.string().min(1).max(8000),
});

export type EditTributeInput = z.input<typeof InputSchema>;

export interface EditTributeResult {
  tributeId: string;
  status: "pending" | "approved";
}

export async function editTribute(params: {
  caller: CallerContext;
  input: EditTributeInput;
  deps: OperationDeps;
}): Promise<EditTributeResult> {
  const { caller, deps } = params;

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("Please check the tribute and try again.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;

  const authorDisplayName = sanitizeLine(input.authorDisplayName);
  const authorRelationship = input.authorRelationship
    ? sanitizeLine(input.authorRelationship)
    : null;
  const message = sanitizePlainText(input.message);

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

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const existing = await repos.tributes.findByEditToken(input.editToken);
    if (!existing) {
      throw new NotFoundError("We couldn't find that tribute. The link may have expired.");
    }

    const feature = await repos.settings.feature(existing.memorialId);
    const autoApprove = feature ? !feature.tributeModerationEnabled : false;
    const status = autoApprove ? "approved" : "pending";

    const updated = await repos.tributes.editByToken(input.editToken, {
      authorDisplayName,
      authorRelationship,
      message,
      status,
    });
    if (!updated) {
      throw new NotFoundError("We couldn't find that tribute. The link may have expired.");
    }

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.userId ? "user" : "anonymous",
      action: "tribute.edited",
      entityType: "tribute",
      entityId: updated.id,
      memorialId: existing.memorialId,
      metadata: { newStatus: status },
    });
    deps.events.record("tribute.edited", {
      memorialId: existing.memorialId,
      tributeId: updated.id,
      autoApproved: autoApprove,
    });
    if (!autoApprove) {
      await notifyMemorialMembers(repos, deps, caller, {
        memorialId: existing.memorialId,
        eventType: "tribute_submitted",
        payload: { tributeId: updated.id, authorDisplayName, edited: true },
      });
    }

    return { tributeId: updated.id, status };
  });
}
