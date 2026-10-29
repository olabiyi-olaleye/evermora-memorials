import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Badge — a small status/label token. Tones are semantic, never decorative;
 * `withDot` adds a non-colour cue so state never rests on colour alone.
 */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-surface-subtle text-fg-muted",
        brand: "bg-brand-soft text-brand-hover",
        accent: "bg-accent-soft text-[#6f4a22]",
        ok: "bg-ok-soft text-[#2c5c3d]",
        warn: "bg-warn-soft text-[#7a5313]",
        bad: "bg-bad-soft text-[#832e28]",
        info: "bg-info-soft text-[#2f5568]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  withDot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, withDot, children, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props}>
      {withDot ? <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
});
