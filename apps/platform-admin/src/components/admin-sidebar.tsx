"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Badge,
  navItemClass,
  NavCount,
  NavList,
  Sidebar,
  SidebarBody,
  SidebarBrand,
  SidebarFooter,
} from "@evermora/ui";
import type { AuthUser } from "@/lib/auth";
import type { AdminCounts } from "@/lib/data/admin";
import { ADMIN_NAV } from "@/lib/nav";
import { AdminAccountMenu } from "./admin-account-menu";

export function AdminSidebar({
  user,
  counts,
  appEnv,
  className,
}: {
  user: AuthUser;
  counts: AdminCounts;
  appEnv: string;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar className={className}>
      <SidebarBrand>
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-lg font-medium tracking-tight text-fg">Evermora</span>
          <span className="text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
            Admin
          </span>
          {appEnv !== "production" ? (
            <Badge tone="warn" className="ml-auto">
              {appEnv}
            </Badge>
          ) : null}
        </Link>
      </SidebarBrand>

      <SidebarBody>
        <NavList aria-label="Admin">
          {ADMIN_NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            const count = item.badge ? counts[item.badge] : undefined;
            return (
              <Item
                key={item.href}
                href={item.href}
                active={active}
                icon={<Icon aria-hidden />}
                count={count}
              >
                {item.label}
              </Item>
            );
          })}
        </NavList>
      </SidebarBody>

      <SidebarFooter>
        <AdminAccountMenu
          name={user.displayName ?? user.email ?? "Staff"}
          email={user.email ?? ""}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

function Item({
  href,
  active,
  icon,
  count,
  children,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={navItemClass({ active })}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      <NavCount count={count ?? 0} active={active} />
    </Link>
  );
}
