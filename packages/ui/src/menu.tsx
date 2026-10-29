"use client";

import * as RMenu from "@radix-ui/react-dropdown-menu";
import { forwardRef } from "react";
import { cn } from "./cn";

/**
 * DropdownMenu — Radix (typeahead, arrow keys, repositions to stay in the
 * viewport). Used for row actions and the account menu.
 */
export const DropdownMenu = RMenu.Root;
export const DropdownMenuTrigger = RMenu.Trigger;
export const DropdownMenuGroup = RMenu.Group;
export const DropdownMenuSeparator = forwardRef<HTMLDivElement, RMenu.DropdownMenuSeparatorProps>(
  function DropdownMenuSeparator({ className, ...props }, ref) {
    return <RMenu.Separator ref={ref} className={cn("my-1 h-px bg-line", className)} {...props} />;
  },
);

export const DropdownMenuContent = forwardRef<HTMLDivElement, RMenu.DropdownMenuContentProps>(
  function DropdownMenuContent({ className, sideOffset = 6, ...props }, ref) {
    return (
      <RMenu.Portal>
        <RMenu.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={12}
          className={cn(
            "z-50 min-w-[11rem] rounded-md border border-line bg-raised p-1 shadow-e2",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className,
          )}
          {...props}
        />
      </RMenu.Portal>
    );
  },
);

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  RMenu.DropdownMenuItemProps & { destructive?: boolean }
>(function DropdownMenuItem({ className, destructive, ...props }, ref) {
  return (
    <RMenu.Item
      ref={ref}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-fg-muted outline-none",
        "data-[highlighted]:bg-surface-subtle data-[highlighted]:text-fg",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        destructive && "text-bad data-[highlighted]:bg-bad-soft data-[highlighted]:text-bad",
        className,
      )}
      {...props}
    />
  );
});

export const DropdownMenuLabel = forwardRef<HTMLDivElement, RMenu.DropdownMenuLabelProps>(
  function DropdownMenuLabel({ className, ...props }, ref) {
    return (
      <RMenu.Label
        ref={ref}
        className={cn(
          "px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase",
          className,
        )}
        {...props}
      />
    );
  },
);
