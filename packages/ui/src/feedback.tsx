import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

/* ---------------- EmptyState ---------------- */

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** A considered empty state — never a blank region. Carries the next action. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("mx-auto max-w-sm px-6 py-10 text-center", className)}>
      {icon ? (
        <div className="mx-auto mb-3 flex size-10 items-center justify-center text-fg-subtle [&_svg]:size-10">
          {icon}
        </div>
      ) : null}
      <h3 className="font-sans text-base font-semibold text-fg">{title}</h3>
      {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* ---------------- Skeleton ---------------- */

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Skeleton({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        aria-hidden
        className={cn("animate-pulse rounded-xs bg-surface-subtle", className)}
        {...props}
      />
    );
  },
);
