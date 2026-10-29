"use client";

import { usePathname } from "next/navigation";
import { ADMIN_SECTION_LABEL } from "@/lib/nav";

/** A single-line page label for the topbar, derived from the path. */
export function AdminBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
  const section = parts[0] ?? "";
  const label = ADMIN_SECTION_LABEL[section] ?? section;

  return <p className="truncate text-sm font-medium text-fg">{label}</p>;
}
