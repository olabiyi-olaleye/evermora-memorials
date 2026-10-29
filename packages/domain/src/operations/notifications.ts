import { z } from "zod";
import { isAuthenticated, type CallerContext } from "../context";
import { UnauthenticatedError, ValidationError } from "../errors";
import type { NotificationRow } from "../ports/rows";
import type { OperationDeps } from "./deps";

/**
 * The in-app notification centre (Phase 5N). Reads / marks-read the signed-in
 * user's own `notifications` rows. RLS scopes both sides to the recipient.
 */

const ListInput = z.object({
  unreadOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type ListMyNotificationsInput = z.input<typeof ListInput>;

export async function listMyNotifications(params: {
  caller: CallerContext;
  input?: ListMyNotificationsInput;
  deps: OperationDeps;
}): Promise<{ notifications: NotificationRow[]; unread: number }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) throw new UnauthenticatedError();
  const parsed = ListInput.safeParse(params.input ?? {});
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const [notifications, unread] = await Promise.all([
      repos.notifications.listForRecipient(caller.userId as string, {
        unreadOnly: parsed.data.unreadOnly,
        limit: parsed.data.limit ?? 30,
      }),
      repos.notifications.unreadCount(caller.userId as string),
    ]);
    return { notifications, unread };
  });
}

const MarkInput = z.object({
  ids: z.array(z.string().min(1)).max(200).optional(),
  all: z.boolean().optional(),
});
export type MarkNotificationsReadInput = z.input<typeof MarkInput>;

export async function markNotificationsRead(params: {
  caller: CallerContext;
  input: MarkNotificationsReadInput;
  deps: OperationDeps;
}): Promise<{ ok: true }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) throw new UnauthenticatedError();
  const parsed = MarkInput.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });

  return deps.unitOfWork.transaction(caller, async (repos) => {
    if (parsed.data.all) {
      await repos.notifications.markAllRead(caller.userId as string);
    } else if (parsed.data.ids && parsed.data.ids.length > 0) {
      await repos.notifications.markRead(parsed.data.ids, caller.userId as string);
    }
    return { ok: true };
  });
}
