import type { AnchorHTMLAttributes } from "react";
import { cn } from "./cn";

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The id of the page's main landmark to jump to. */
  targetId?: string;
}

/**
 * A keyboard-only "Skip to content" link (WCAG 2.4.1 Bypass Blocks) —
 * visually hidden until it receives focus, so the first Tab press on any
 * page with site chrome (nav, sidebar) lets a keyboard user jump straight to
 * `<main id={targetId}>` instead of tabbing through every nav item first.
 * Render it as the very first element in `<body>`.
 */
export function SkipLink({
  targetId = "main-content",
  className,
  children = "Skip to content",
  ...props
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-[100]",
        "focus-visible:rounded-sm focus-visible:bg-brand focus-visible:px-4 focus-visible:py-2",
        "focus-visible:text-sm focus-visible:font-semibold focus-visible:text-on-brand",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
