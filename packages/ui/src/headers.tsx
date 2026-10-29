import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "./navigation";
import { cn } from "./cn";

/**
 * PageHeader — anchors every screen: optional breadcrumb, a serif title, a
 * mono meta line, and the actions. On narrow screens the actions wrap under
 * the title, dominant action first.
 */
export interface PageHeaderProps {
  title: ReactNode;
  breadcrumb?: Crumb[];
  /** Mono sub-line — dates, status, address. */
  meta?: ReactNode;
  /** A plain-language sub-line under the title. */
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  breadcrumb,
  meta,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("rounded-lg border border-line bg-raised px-5 py-5 sm:px-6", className)}>
      {breadcrumb ? <Breadcrumb items={breadcrumb} className="mb-2.5" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[26px] leading-tight font-medium text-fg">{title}</h1>
          {meta ? <p className="mt-1 font-mono text-[13px] text-fg-subtle">{meta}</p> : null}
          {description ? (
            <p className="mt-1.5 max-w-prose text-sm text-fg-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/**
 * SectionHeader — a lighter divider inside a page. Title, optional description,
 * optional single action aligned right.
 */
export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="font-serif text-xl font-medium text-fg">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-prose text-sm text-fg-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
