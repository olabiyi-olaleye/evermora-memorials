import { Flag, LayoutDashboard, ScrollText, Wrench, type LucideIcon } from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which count from `getAdminCounts` to show as a badge. */
  badge?: "openReports" | "newServiceRequests";
}

/** Only routes that are implemented. Users / Audit / Support need domain ops
 *  that don't exist yet — they arrive with their own phases. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/memorials", label: "Memorials", icon: ScrollText },
  { href: "/reports", label: "Reports", icon: Flag, badge: "openReports" },
  {
    href: "/service-requests",
    label: "Service requests",
    icon: Wrench,
    badge: "newServiceRequests",
  },
];

export const ADMIN_SECTION_LABEL: Record<string, string> = {
  "": "Overview",
  memorials: "Memorials",
  reports: "Reports",
  "service-requests": "Service requests",
  design: "Design system",
};
