"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  Avatar,
  Badge,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  StatusBadge,
} from "@evermora/ui";
import type { DashboardMemorial } from "@/lib/data/memorials";

/**
 * The memorial context block at the top of the sidebar. Shows which memorial is
 * being managed and switches between them. When the family has one memorial it
 * still appears — it is the anchor for the whole sidebar.
 */
export function MemorialSwitcher({
  memorials,
  activeId,
}: {
  memorials: DashboardMemorial[];
  activeId: string | null;
}) {
  const active = memorials.find((m) => m.id === activeId) ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch memorial"
          className="flex w-full items-center gap-3 rounded-md border border-line bg-raised px-3 py-2.5 text-left transition-colors hover:border-line-strong"
        >
          <Avatar name={active?.fullName ?? "Evermora"} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-fg">
              {active ? active.fullName : "Your memorials"}
            </span>
            <span className="block truncate text-[11.5px] text-fg-subtle">
              {active
                ? "Managing this memorial"
                : `${memorials.length} memorial${memorials.length === 1 ? "" : "s"}`}
            </span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-fg-subtle" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Your memorials</DropdownMenuLabel>
        {memorials.map((m) => (
          <DropdownMenuItem key={m.id} asChild>
            <Link href={`/memorials/${m.id}`}>
              <Check
                aria-hidden
                className={cn("size-4", m.id === activeId ? "opacity-100" : "opacity-0")}
              />
              <span className="min-w-0 flex-1 truncate">{m.fullName}</span>
              <StatusBadge status={m.status} />
            </Link>
          </DropdownMenuItem>
        ))}
        {memorials.length === 0 ? (
          <p className="px-2.5 py-1.5 text-sm text-fg-subtle">No memorials yet.</p>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/memorials/new">
            <Plus aria-hidden />
            New memorial
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Compact status line used in the topbar breadcrumb. */
export function MemorialBadges({ memorial }: { memorial: DashboardMemorial }) {
  return (
    <span className="flex items-center gap-1.5">
      <StatusBadge status={memorial.status} />
      {memorial.pendingTributeCount > 0 ? (
        <Badge tone="warn">{memorial.pendingTributeCount} to review</Badge>
      ) : null}
    </span>
  );
}
