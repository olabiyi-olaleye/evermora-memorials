import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "./cn";

/**
 * Table — semantic `<table>` elements, always wrapped so it scrolls inside its
 * own container and the page body never does. Below `sm` the app may swap to a
 * stacked presentation; the primitives here cover the desktop grid.
 */
export const TableWrap = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function TableWrap({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("overflow-x-auto rounded-lg border border-line", className)}
        {...props}
      />
    );
  },
);

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(function Table(
  { className, ...props },
  ref,
) {
  return (
    <table
      ref={ref}
      className={cn("w-full min-w-[36rem] border-collapse text-sm", className)}
      {...props}
    />
  );
});

export const Thead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function Thead({ className, ...props }, ref) {
    return <thead ref={ref} className={cn("bg-surface-subtle", className)} {...props} />;
  },
);

export const Tbody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function Tbody({ className, ...props }, ref) {
    return (
      <tbody ref={ref} className={cn("[&_tr:last-child_td]:border-b-0", className)} {...props} />
    );
  },
);

export const Tr = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(function Tr(
  { className, ...props },
  ref,
) {
  return <tr ref={ref} className={cn("hover:bg-surface", className)} {...props} />;
});

export const Th = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  function Th({ className, ...props }, ref) {
    return (
      <th
        ref={ref}
        scope="col"
        className={cn(
          "border-b border-line px-4 py-2.5 text-left text-[11.5px] font-semibold tracking-wide text-fg-subtle uppercase",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Td = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  function Td({ className, ...props }, ref) {
    return (
      <td
        ref={ref}
        className={cn("border-b border-line px-4 py-3 align-middle text-fg-muted", className)}
        {...props}
      />
    );
  },
);
