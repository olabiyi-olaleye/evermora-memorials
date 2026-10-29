import type { NotificationEventType } from "@evermora/types";
import type { CallerContext } from "../context";
import type { Repositories } from "../ports/repositories";
import type { OperationDeps } from "./deps";

/**
 * In-transaction notification recording (Phase 5N). Writes `notifications` rows
 * (channel `in_app` by default) for the resolved recipients, excluding the
 * actor. External delivery (email / SMS) is a separate worker and needs a
 * provider — `channel: "email"` rows are recorded for it but not sent here.
 */

type Repos = Repositories;

interface NotifyOptions {
  memorialId: string | null;
  eventType: NotificationEventType;
  payload: Record<string, unknown>;
  channel?: "in_app" | "email";
}

/** Notify every active member of a memorial (except the actor). */
export async function notifyMemorialMembers(
  repos: Repos,
  deps: OperationDeps,
  caller: CallerContext,
  opts: NotifyOptions & { memorialId: string },
): Promise<void> {
  const memberIds = await repos.notifications.memorialRecipientIds(opts.memorialId);
  const recipients = memberIds.filter((id) => id && id !== caller.userId);
  await write(repos, deps, recipients, opts);
}

/** Notify every platform-staff account. */
export async function notifyPlatformStaff(
  repos: Repos,
  deps: OperationDeps,
  caller: CallerContext,
  opts: NotifyOptions,
): Promise<void> {
  const staff = (await repos.profiles.platformAdminIds()).filter((id) => id !== caller.userId);
  await write(repos, deps, staff, opts);
}

/** Notify one person by email address (pre-account invitees). */
export async function notifyByEmail(
  repos: Repos,
  deps: OperationDeps,
  email: string,
  opts: NotifyOptions,
): Promise<void> {
  await repos.notifications.recordMany([
    {
      id: deps.ids.newId(),
      recipientProfileId: null,
      recipientEmail: email.toLowerCase(),
      memorialId: opts.memorialId,
      eventType: opts.eventType,
      channel: opts.channel ?? "email",
      payload: opts.payload,
    },
  ]);
}

async function write(
  repos: Repos,
  deps: OperationDeps,
  recipientProfileIds: string[],
  opts: NotifyOptions,
): Promise<void> {
  const unique = [...new Set(recipientProfileIds)];
  if (unique.length === 0) return;
  await repos.notifications.recordMany(
    unique.map((profileId) => ({
      id: deps.ids.newId(),
      recipientProfileId: profileId,
      recipientEmail: null,
      memorialId: opts.memorialId,
      eventType: opts.eventType,
      channel: opts.channel ?? "in_app",
      payload: opts.payload,
    })),
  );
}
