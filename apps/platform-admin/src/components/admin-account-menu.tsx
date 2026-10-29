"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronsUpDown, LayoutGrid, LogOut } from "lucide-react";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SidebarAccount,
} from "@evermora/ui";
import { signOutAction } from "@/lib/actions/auth";

export function AdminAccountMenu({ name, email }: { name: string; email: string }) {
  const [pending, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarAccount
          media={<Avatar name={name} size="md" />}
          name={name}
          detail="Platform staff"
          trailing={<ChevronsUpDown aria-hidden className="size-4 shrink-0 text-fg-subtle" />}
          aria-label="Account menu"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/design">
            <LayoutGrid aria-hidden />
            Design system
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            start(() => {
              void signOutAction();
            });
          }}
        >
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
