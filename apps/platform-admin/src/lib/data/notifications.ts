import "server-only";
import type { NotificationChannel, NotificationEventType } from "@evermora/types";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface NotificationItem {
  id: string;
  memorialId: string | null;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

/** The signed-in staff account's own in-app notifications, newest first. RLS-scoped. */
export async function getMyNotifications(
  limit = 30,
): Promise<{ notifications: NotificationItem[]; unread: number }> {
  const supabase = await getSupabaseServer();
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, memorial_id, event_type, channel, payload, read_at, created_at")
      .eq("channel", "in_app")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("channel", "in_app")
      .is("read_at", null),
  ]);

  return {
    notifications: (data ?? []).map((n) => ({
      id: n.id,
      memorialId: n.memorial_id,
      eventType: n.event_type as NotificationEventType,
      channel: n.channel as NotificationChannel,
      payload: (n.payload ?? {}) as Record<string, unknown>,
      readAt: n.read_at,
      createdAt: n.created_at,
    })),
    unread: count ?? 0,
  };
}
