import { ChevronRight } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

/* ---------------- Breadcrumb ---------------- */

export interface Crumb {
  label: ReactNode;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1.5 text-[13px]", className)}>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {c.href && !last ? (
              <a href={c.href} className="text-fg-muted hover:text-fg">
                {c.label}
              </a>
            ) : (
              <span
                className={last ? "text-fg-subtle" : "text-fg-muted"}
                aria-current={last ? "page" : undefined}
              >
                {c.label}
              </span>
            )}
            {!last && <ChevronRight className="size-3.5 text-fg-subtle" aria-hidden />}
          </Fragment>
        );
      })}
    </nav>
  );
}

/* ---------------- Pagination ---------------- */

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3 text-sm", className)}
    >
      <p className="text-fg-subtle">
        Page <span className="font-mono tabular-nums">{page}</span> of{" "}
        <span className="font-mono tabular-nums">{pageCount}</span>
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
