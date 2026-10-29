import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/**
 * App-shell primitives. Apps compose these into their `(app)` layout via
 * `AppShell`: a `Sidebar` on `lg+`, the same nav inside a `Drawer` below `lg`.
 * Active state is unambiguous — evergreen text on a brand-soft fill.
 */

/* ---------------- Sidebar ---------------- */

export function Sidebar({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-line bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarBrand({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex h-14 shrink-0 items-center border-b border-line px-4", className)}>
      {children}
    </div>
  );
}

/** The scrolling middle of the sidebar — nav groups live here. */
export function SidebarBody({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4", className)}>
      {children}
    </div>
  );
}

/** A pinned region at the bottom of the sidebar — the account block. */
export function SidebarFooter({ className, children }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shrink-0 border-t border-line p-3", className)}>{children}</div>;
}

export function NavList({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("flex flex-col gap-0.5", className)} {...props}>
      {children}
    </nav>
  );
}

export function NavSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 mb-1 px-3 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase first:mt-0">
      {children}
    </p>
  );
}

/** The NavItem shell classes — for composing a framework `<Link>` directly. */
export function navItemClass(opts: { active?: boolean; className?: string } = {}): string {
  return cn(
    "flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
    "[&_svg]:size-[17px] [&_svg]:shrink-0",
    opts.active
      ? "bg-brand-soft text-brand-hover [&_svg]:text-brand"
      : "text-fg-muted hover:bg-surface-subtle hover:text-fg [&_svg]:text-fg-subtle",
    opts.className,
  );
}

/**
 * A count pill for the trailing edge of a nav item. Decorative for the
 * accessible name (so `getByRole("link", { name, exact: true })` still matches
 * the label alone); the same count is stated on the destination page and
 * announced there.
 */
export function NavCount({ count, active }: { count: number; active?: boolean }) {
  if (!count) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "min-w-5 rounded-full px-1.5 text-center font-mono text-[11px] leading-5 tabular-nums",
        active ? "bg-brand text-on-brand" : "bg-warn-soft text-warn",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export interface NavItemProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  icon?: ReactNode;
  count?: number;
  note?: string;
}

/** A plain-anchor nav item (external links, or where MPA nav is fine). */
export function NavItem({
  active,
  icon,
  count,
  note,
  className,
  children,
  ...props
}: NavItemProps) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={navItemClass({ active, className })}
      {...props}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {note ? <span className="text-[11px] text-fg-subtle">{note}</span> : null}
      <NavCount count={count ?? 0} active={active} />
    </a>
  );
}

/**
 * SidebarAccount — the identity block at the foot of the sidebar. Wrap it in
 * the app's account `DropdownMenu` trigger; `trailing` is the affordance
 * (a chevron, usually).
 */
export function SidebarAccount({
  media,
  name,
  detail,
  trailing,
  className,
  ...props
}: HTMLAttributes<HTMLButtonElement> & {
  media?: ReactNode;
  name: ReactNode;
  detail?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-surface-subtle",
        className,
      )}
      {...props}
    >
      {media}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-fg">{name}</span>
        {detail ? (
          <span className="block truncate text-[11.5px] text-fg-subtle">{detail}</span>
        ) : null}
      </span>
      {trailing}
    </button>
  );
}

/* ---------------- Topbar ---------------- */

export interface TopbarProps extends HTMLAttributes<HTMLElement> {
  /** Menu trigger — rendered on the left below `lg` only. */
  menu?: ReactNode;
  /** Breadcrumb / page context — center-left. */
  brand?: ReactNode;
  /** Actions — right side (a contextual action, notifications, account). */
  actions?: ReactNode;
}

export function Topbar({ menu, brand, actions, className, ...props }: TopbarProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6",
        className,
      )}
      {...props}
    >
      {menu ? <span className="lg:hidden">{menu}</span> : null}
      <div className="min-w-0 flex-1">{brand}</div>
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}
