"use client";

import * as RDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { IconButton } from "./button";
import { cn } from "./cn";

/**
 * Dialog — Radix (focus trapped, Esc closes, trigger regains focus, scroll
 * locked, backdrop inert). Centred ≤ 440px on desktop; full-width with a 16px
 * inset below `sm`.
 *
 * Drawer — the same primitive slid in from a side, used for the mobile
 * navigation sheet.
 */
export const Dialog = RDialog.Root;
export const DialogTrigger = RDialog.Trigger;
export const DialogClose = RDialog.Close;

const Overlay = forwardRef<HTMLDivElement, RDialog.DialogOverlayProps>(function Overlay(
  { className, ...props },
  ref,
) {
  return (
    <RDialog.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-[#262f2a]/40 backdrop-blur-[1px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
});

export interface DialogContentProps extends Omit<RDialog.DialogContentProps, "title"> {
  /** Accessible title — required. Pass `hideTitle` to render it visually hidden. */
  title: ReactNode;
  description?: ReactNode;
  hideTitle?: boolean;
  footer?: ReactNode;
  /** Hide the corner close button (e.g. a forced choice). */
  hideClose?: boolean;
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(function DialogContent(
  { className, title, description, hideTitle, footer, hideClose, children, ...props },
  ref,
) {
  return (
    <RDialog.Portal>
      <Overlay />
      <RDialog.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-raised shadow-e3",
          "inset-x-4 bottom-4 rounded-lg p-6",
          "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[min(28rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2",
          "border border-line",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <RDialog.Title
              className={cn("font-sans text-[17px] font-semibold text-fg", hideTitle && "sr-only")}
            >
              {title}
            </RDialog.Title>
            {description ? (
              <RDialog.Description className="mt-1.5 text-sm text-fg-muted">
                {description}
              </RDialog.Description>
            ) : null}
          </div>
          {!hideClose ? (
            <RDialog.Close asChild>
              <IconButton
                aria-label="Close"
                variant="ghost"
                size="sm"
                className="-mt-1 -mr-1 shrink-0"
              >
                <X aria-hidden />
              </IconButton>
            </RDialog.Close>
          ) : null}
        </div>
        {children ? <div className="text-sm text-fg-muted">{children}</div> : null}
        {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </RDialog.Content>
    </RDialog.Portal>
  );
});

/* ---------------- Drawer (side sheet — mobile nav) ---------------- */

export interface DrawerContentProps extends Omit<RDialog.DialogContentProps, "title"> {
  title: ReactNode;
  side?: "left" | "right";
  /**
   * Skip the built-in header + padding and render `children` edge to edge
   * (for hosting a full sidebar that has its own brand bar). The `title` is
   * still rendered, visually hidden, for the dialog's accessible name.
   */
  bare?: boolean;
}

export const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(function DrawerContent(
  { className, title, side = "left", bare, children, ...props },
  ref,
) {
  return (
    <RDialog.Portal>
      <Overlay />
      <RDialog.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-e3",
          side === "left" ? "left-0 border-r" : "right-0 border-l",
          "border-line",
          side === "left"
            ? "data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left"
            : "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
          className,
        )}
        {...props}
      >
        {bare ? (
          <>
            <RDialog.Title className="sr-only">{title}</RDialog.Title>
            {children}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <RDialog.Title className="font-serif text-base font-medium text-fg">
                {title}
              </RDialog.Title>
              <RDialog.Close asChild>
                <IconButton aria-label="Close menu" variant="ghost" size="sm">
                  <X aria-hidden />
                </IconButton>
              </RDialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{children}</div>
          </>
        )}
      </RDialog.Content>
    </RDialog.Portal>
  );
});
