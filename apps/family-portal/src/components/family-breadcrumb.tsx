"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { DashboardMemorial } from "@/lib/data/memorials";
import { MEMORIAL_NAV } from "@/lib/nav";

const ROOT_LABELS: Record<string, string> = {
  "": "Home",
  account: "Account",
  notifications: "Notifications",
  "memorials/new": "New memorial",
};

const SECTION_LABEL = new Map(
  MEMORIAL_NAV.flatMap((g) => g.items.map((i) => [i.segment, i.label] as const)),
);

/** A compact breadcrumb for the topbar, derived from the path. */
export function FamilyBreadcrumb({ memorials }: { memorials: DashboardMemorial[] }) {
  const pathname = usePathname();
  const parts = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

  const crumbs: { label: string; href?: string }[] = [];

  if (parts[0] === "memorials" && parts[1] && parts[1] !== "new") {
    const memorial = memorials.find((m) => m.id === parts[1]);
    crumbs.push({ label: "Memorials", href: "/" });
    crumbs.push({
      label: memorial?.fullName ?? "Memorial",
      href: `/memorials/${parts[1]}`,
    });
    const section = parts[2] ?? "";
    if (section) crumbs.push({ label: SECTION_LABEL.get(section) ?? section });
  } else {
    const key = parts.join("/");
    crumbs.push({ label: ROOT_LABELS[key] ?? ROOT_LABELS[parts[0] ?? ""] ?? "Home" });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <Fragment key={i}>
            {c.href && !last ? (
              <Link href={c.href} className="shrink-0 text-fg-muted hover:text-fg">
                {c.label}
              </Link>
            ) : (
              <span
                className={last ? "truncate font-medium text-fg" : "shrink-0 text-fg-muted"}
                aria-current={last ? "page" : undefined}
              >
                {c.label}
              </span>
            )}
            {!last ? (
              <ChevronRight aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
            ) : null}
          </Fragment>
        );
      })}
    </nav>
  );
}
