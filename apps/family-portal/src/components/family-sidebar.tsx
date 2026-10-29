"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import {
  navItemClass,
  NavCount,
  NavList,
  NavSectionLabel,
  Sidebar,
  SidebarBody,
  SidebarBrand,
  SidebarFooter,
} from "@evermora/ui";
import type { AuthUser } from "@/lib/auth";
import type { DashboardMemorial } from "@/lib/data/memorials";
import { MEMORIAL_NAV } from "@/lib/nav";
import { AccountMenu } from "./account-menu";
import { MemorialSwitcher } from "./memorial-switcher";

/** Extract `/memorials/{id}` from the path, if we're inside a memorial. */
function activeMemorialId(pathname: string): string | null {
  const m = pathname.match(/^\/memorials\/([0-9a-f-]{36})(?:\/|$)/i);
  return m?.[1] ?? null;
}

export function FamilySidebar({
  user,
  memorials,
  className,
}: {
  user: AuthUser;
  memorials: DashboardMemorial[];
  className?: string;
}) {
  const pathname = usePathname();
  const activeId = activeMemorialId(pathname);
  const activePending = memorials.find((m) => m.id === activeId)?.pendingTributeCount ?? 0;

  return (
    <Sidebar className={className}>
      <SidebarBrand>
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-tight text-fg transition-colors hover:text-brand"
        >
          Evermora
        </Link>
      </SidebarBrand>

      {memorials.length > 0 ? (
        <div className="border-b border-line px-3 py-3">
          <MemorialSwitcher memorials={memorials} activeId={activeId} />
        </div>
      ) : null}

      <SidebarBody>
        {activeId ? (
          <MemorialNav
            base={`/memorials/${activeId}`}
            pathname={pathname}
            pending={activePending}
          />
        ) : (
          <RootNav memorials={memorials} pathname={pathname} />
        )}
      </SidebarBody>

      <SidebarFooter>
        <AccountMenu
          name={user.displayName ?? user.email ?? "Your account"}
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
  note,
  children,
}: {
  href: string;
  active: boolean;
  icon?: ReactNode;
  count?: number;
  note?: string;
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
      {note ? <span className="text-[11px] text-fg-subtle">{note}</span> : null}
      <NavCount count={count ?? 0} active={active} />
    </Link>
  );
}

function MemorialNav({
  base,
  pathname,
  pending,
}: {
  base: string;
  pathname: string;
  pending: number;
}) {
  return (
    <>
      {MEMORIAL_NAV.map((group) => (
        <div key={group.label}>
          {group.label !== "Overview" ? <NavSectionLabel>{group.label}</NavSectionLabel> : null}
          <NavList aria-label={group.label}>
            {group.items.map((item) => {
              const href = item.segment ? `${base}/${item.segment}` : base;
              const active = item.segment
                ? pathname === href || pathname.startsWith(`${href}/`)
                : pathname === base;
              const Icon = item.icon;
              return (
                <Item
                  key={item.segment || "overview"}
                  href={href}
                  active={active}
                  icon={<Icon aria-hidden />}
                  count={item.badge === "tributes" ? pending : undefined}
                >
                  {item.label}
                </Item>
              );
            })}
          </NavList>
        </div>
      ))}
    </>
  );
}

function RootNav({ memorials, pathname }: { memorials: DashboardMemorial[]; pathname: string }) {
  return (
    <>
      <NavList aria-label="Home">
        <Item href="/" active={pathname === "/"}>
          Home
        </Item>
      </NavList>

      {memorials.length > 0 ? (
        <>
          <NavSectionLabel>Memorials</NavSectionLabel>
          <NavList aria-label="Memorials">
            {memorials.map((m) => (
              <Item
                key={m.id}
                href={`/memorials/${m.id}`}
                active={pathname.startsWith(`/memorials/${m.id}`)}
                count={m.pendingTributeCount || undefined}
              >
                {m.fullName}
              </Item>
            ))}
          </NavList>
        </>
      ) : null}

      <NavList aria-label="Create" className="mt-4">
        <Item
          href="/memorials/new"
          active={pathname === "/memorials/new"}
          icon={<Plus aria-hidden />}
        >
          New memorial
        </Item>
      </NavList>
    </>
  );
}
