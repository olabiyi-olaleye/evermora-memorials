import type { ReactNode } from "react";
import { cn } from "./cn";

export interface StatCardProps {
  /** Uppercase label above the figure. */
  label: ReactNode;
  /** The figure — rendered in tabular mono. */
  value: ReactNode;
  /** Small context line under the figure. */
  hint?: ReactNode;
  /** `attention` shifts the figure to the warning colour — for counts that need a look. */
  tone?: "default" | "attention";
  /** Wrap the whole card in a link. */
  href?: string;
  className?: string;
}

/**
 * StatCard — a single operational figure. The one that needs attention shifts
 * colour, not just size. Digits are tabular so a row of these stays aligned.
 */
export function StatCard({ label, value, hint, tone = "default", href, className }: StatCardProps) {
  const inner = (
    <>
      <div className="text-[12.5px] font-semibold tracking-wide text-fg-subtle uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-1.5 font-mono text-[30px] leading-none font-medium tabular-nums",
          tone === "attention" ? "text-warn" : "text-fg",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-fg-muted">{hint}</div> : null}
    </>
  );

  const cls = cn(
    "block rounded-md border border-line bg-raised px-5 py-4 transition-colors",
    href && "hover:border-line-strong hover:bg-surface",
    className,
  );

  return href ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
