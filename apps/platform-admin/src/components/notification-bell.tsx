"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { IconButton } from "@evermora/ui";
import type { NotificationEventType } from "@evermora/types";
import { markNotificationsReadAction } from "@/lib/actions/notifications";
import type { NotificationItem } from "@/lib/data/notifications";

const LABEL: Record<NotificationEventType, string> = {
  tribute_submitted: "A tribute was submitted for review",
  tribute_approved: "A tribute was approved",
  photo_submitted: "A photo was submitted for review",
  admin_invited: "A family admin was invited",
  funeral_event_published: "A funeral event was published",
  funeral_event_updated: "A funeral event was updated",
  family_update_published: "A family update was published",
  service_request_received: "A new service request came in",
  memorial_reported: "A memorial was reported",
  anniversary_upcoming: "An anniversary is coming up",
};

const HREF: Partial<Record<NotificationEventType, string>> = {
  memorial_reported: "/reports",
  service_request_received: "/service-requests",
};

function describe(n: NotificationItem): string {
  const reason = typeof n.payload.reason === "string" ? n.payload.reason : null;
  const base = LABEL[n.eventType] ?? n.eventType;
  return reason ? `${base} (${reason})` : base;
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NotificationBell({
  notifications,
  unread,
}: {
  notifications: NotificationItem[];
  unread: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const mark = (payload: { all: true } | { ids: string[] }) =>
    startTransition(async () => {
      await markNotificationsReadAction(payload);
      router.refresh();
    });

  return (
    <div className="relative">
      <IconButton
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative"
      >
        <Bell aria-hidden />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 font-mono text-[10px] leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </IconButton>

      {open ? (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line bg-raised shadow-e2">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-sm font-semibold text-fg">Notifications</span>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => mark({ all: true })}
                  disabled={pending}
                  className="text-xs text-fg-subtle underline hover:text-fg disabled:opacity-50"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-fg-subtle">
                  No notifications yet.
                </li>
              ) : null}
              {notifications.map((n) => {
                const isUnread = n.readAt === null;
                const href = HREF[n.eventType];
                const body = (
                  <div className="flex items-start gap-2 px-4 py-3">
                    <span
                      className={
                        isUnread
                          ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
                          : "mt-1.5 size-1.5 shrink-0"
                      }
                      aria-hidden
                    />
                    <div>
                      <p className="text-[13px] text-fg">{describe(n)}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <li
                    key={n.id}
                    data-unread={isUnread || undefined}
                    className="border-b border-line last:border-0"
                  >
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => {
                          setOpen(false);
                          if (isUnread) mark({ ids: [n.id] });
                        }}
                        className="block hover:bg-surface-subtle"
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => isUnread && mark({ ids: [n.id] })}
                        className="block w-full text-left hover:bg-surface-subtle"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
