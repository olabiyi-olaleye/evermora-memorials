"use client";

import * as RTooltip from "@radix-ui/react-tooltip";
import { forwardRef, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * Tooltip — supplementary hints only (never the sole source of information).
 * Radix handles hover + focus + touch + Esc. Wrap the app once in
 * `TooltipProvider`.
 */
export const TooltipProvider = RTooltip.Provider;

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: RTooltip.TooltipContentProps["side"];
  delayDuration?: number;
}

export const Tooltip = forwardRef<HTMLButtonElement, TooltipProps>(function Tooltip(
  { content, children, side = "top", delayDuration = 200 },
  _ref,
) {
  return (
    <RTooltip.Root delayDuration={delayDuration}>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 max-w-[16rem] rounded-sm bg-fg px-2.5 py-1.5 text-xs text-canvas shadow-e2",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
          )}
        >
          {content}
          <RTooltip.Arrow className="fill-fg" />
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
});
