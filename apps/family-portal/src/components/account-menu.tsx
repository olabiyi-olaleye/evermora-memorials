"use client";

import { useTransition } from "react";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
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
import { clearAuthCaches } from "@/lib/sign-out";

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const [pending, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarAccount
          media={<Avatar name={name} size="md" />}
          name={name}
          detail={email}
          trailing={<ChevronsUpDown aria-hidden className="size-4 shrink-0 text-fg-subtle" />}
          aria-label="Account menu"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-52">
        <DropdownMenuLabel>{email}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound aria-hidden />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            clearAuthCaches();
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
