import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * EntityHeader — the header for a page that is *about* something with an
 * identity: a memorial, a user, a report. A leading visual (portrait / avatar /
 * monogram), a serif title, a metadata row, and a wrapping actions cluster.
 * `PageHeader` stays for plain pages that are not about one entity.
 */
export interface EntityHeaderProps {
  media?: ReactNode;
  title: ReactNode;
  /** Small items under the title — dates, an address, a status badge. */
  meta?: ReactNode;
  /** Right-aligned actions; wrap on narrow screens. */
  actions?: ReactNode;
  /** A breadcrumb or back-link above the title. */
  above?: ReactNode;
  className?: string;
}

export function EntityHeader({ media, title, meta, actions, above, className }: EntityHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {above}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {media ? <div className="shrink-0">{media}</div> : null}
          <div className="min-w-0 flex-col">
            <h1 className="font-serif text-[clamp(1.375rem,1.1rem+1vw,1.75rem)] leading-tight text-balance text-fg">
              {title}
            </h1>
            {meta ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
                {meta}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
