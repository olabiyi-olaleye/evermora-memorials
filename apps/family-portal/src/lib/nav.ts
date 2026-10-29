import {
  Calendar,
  Eye,
  Images,
  LayoutDashboard,
  Megaphone,
  MessageSquareQuote,
  ScrollText,
  Settings,
  Share2,
  ShieldCheck,
  SquarePen,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * The per-memorial navigation, grouped by intent rather than a flat list.
 * `segment` is appended to `/memorials/{id}`; `""` is the Overview.
 * Route paths are unchanged from the MVP — only the grouping and labels.
 */
export interface MemorialNavItem {
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Show the pending-tribute count badge here. */
  badge?: "tributes";
}

export interface MemorialNavGroup {
  label: string;
  items: MemorialNavItem[];
}

export const MEMORIAL_NAV: MemorialNavGroup[] = [
  {
    label: "Overview",
    items: [{ segment: "", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "The memorial",
    items: [
      { segment: "edit", label: "Basic information", icon: SquarePen },
      { segment: "story", label: "Their story", icon: ScrollText },
      { segment: "photos", label: "Photos & memories", icon: Images },
      { segment: "preview", label: "Preview", icon: Eye },
    ],
  },
  {
    label: "Community",
    items: [
      { segment: "tributes", label: "Tributes", icon: MessageSquareQuote, badge: "tributes" },
      { segment: "updates", label: "Family updates", icon: Megaphone },
    ],
  },
  {
    label: "Funeral",
    items: [{ segment: "funeral", label: "Funeral", icon: Calendar }],
  },
  {
    label: "Sharing",
    items: [{ segment: "share", label: "Share & QR", icon: Share2 }],
  },
  {
    label: "Manage",
    items: [
      { segment: "customize", label: "Privacy & sections", icon: ShieldCheck },
      { segment: "family", label: "Family access", icon: Users },
      { segment: "services", label: "Services", icon: UserRoundCog },
      { segment: "settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Top-level nav shown when no memorial is open. */
export const ROOT_NAV: MemorialNavItem[] = [{ segment: "", label: "Home", icon: LayoutDashboard }];
