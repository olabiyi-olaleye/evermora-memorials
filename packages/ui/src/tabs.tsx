"use client";

import * as RTabs from "@radix-ui/react-tabs";
import { forwardRef } from "react";
import { cn } from "./cn";

/**
 * Tabs — Radix under the hood (roving focus, arrow-key nav). The list scrolls
 * horizontally with no visible scrollbar and an edge fade on overflow; the
 * active tab is evergreen with a 2px underline, never a faint colour shift.
 */
export const Tabs = RTabs.Root;

export const TabsList = forwardRef<HTMLDivElement, RTabs.TabsListProps>(function TabsList(
  { className, ...props },
  ref,
) {
  return (
    <RTabs.List
      ref={ref}
      className={cn(
        "flex gap-0.5 overflow-x-auto border-b border-line",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<HTMLButtonElement, RTabs.TabsTriggerProps>(
  function TabsTrigger({ className, ...props }, ref) {
    return (
      <RTabs.Trigger
        ref={ref}
        className={cn(
          "-mb-px shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium whitespace-nowrap text-fg-muted transition-colors",
          "hover:text-fg",
          "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand",
          "data-[state=active]:border-brand data-[state=active]:font-semibold data-[state=active]:text-brand",
          className,
        )}
        {...props}
      />
    );
  },
);

export const TabsContent = forwardRef<HTMLDivElement, RTabs.TabsContentProps>(function TabsContent(
  { className, ...props },
  ref,
) {
  return (
    <RTabs.Content
      ref={ref}
      className={cn("focus-visible:outline-2 focus-visible:outline-brand", className)}
      {...props}
    />
  );
});
