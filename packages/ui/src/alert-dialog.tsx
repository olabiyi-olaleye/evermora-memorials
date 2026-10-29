"use client";

import * as RAlert from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";

/**
 * AlertDialog — a forced choice for a consequential action. Radix (focus
 * trapped, no dismiss-on-outside-click, focus goes to the safe action). The
 * consequence is named in plain language; the dangerous verb sits on the right.
 */
export const AlertDialog = RAlert.Root;
export const AlertDialogTrigger = RAlert.Trigger;

export interface AlertDialogProps extends Omit<RAlert.AlertDialogContentProps, "title"> {
  title: ReactNode;
  description: ReactNode;
  /** Label for the confirming action. */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` gives the confirm button the destructive treatment. */
  tone?: "danger" | "brand";
  onConfirm?: () => void;
}

export const AlertDialogContent = forwardRef<HTMLDivElement, AlertDialogProps>(
  function AlertDialogContent(
    {
      className,
      title,
      description,
      confirmLabel,
      cancelLabel = "Cancel",
      tone = "danger",
      onConfirm,
      ...props
    },
    ref,
  ) {
    return (
      <RAlert.Portal>
        <RAlert.Overlay className="fixed inset-0 z-50 bg-[#262f2a]/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <RAlert.Content
          ref={ref}
          className={cn(
            "fixed z-50 flex flex-col gap-4 border border-line bg-raised p-6 shadow-e3",
            "inset-x-4 bottom-4 rounded-lg",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[min(27rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className,
          )}
          {...props}
        >
          <div className="flex gap-3">
            {tone === "danger" ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bad-soft text-bad">
                <AlertTriangle className="size-[18px]" aria-hidden />
              </span>
            ) : null}
            <div>
              <RAlert.Title className="font-sans text-[17px] font-semibold text-fg">
                {title}
              </RAlert.Title>
              <RAlert.Description className="mt-2 text-sm text-fg-muted">
                {description}
              </RAlert.Description>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <RAlert.Cancel asChild>
              <Button variant="ghost">{cancelLabel}</Button>
            </RAlert.Cancel>
            <RAlert.Action asChild>
              <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </RAlert.Action>
          </div>
        </RAlert.Content>
      </RAlert.Portal>
    );
  },
);
