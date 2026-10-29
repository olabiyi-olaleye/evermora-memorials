import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * The one place screen width is decided. Three roles, used consistently so
 * "how wide is this?" is a deliberate choice, never an accident:
 *
 * - `editorial`  — marketing prose, the memorial story, legal pages. A reading
 *                  measure, not a layout width.
 * - `app`        — family forms, settings, content editors, auth.
 * - `dashboard`  — overviews, tables, queues, galleries. Fills a wide desktop.
 *
 * `bleed` drops the max-width (for a full-bleed marketing section that clamps
 * its own inner content).
 */
export type ContainerSize = "editorial" | "app" | "dashboard" | "bleed";

const SIZES: Record<ContainerSize, string> = {
  editorial: "max-w-[46rem]",
  app: "max-w-5xl",
  dashboard: "max-w-[88rem]",
  bleed: "max-w-none",
};

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  size?: ContainerSize;
  /** Render as something other than a `<div>` (e.g. `"main"`, `"section"`). */
  as?: ElementType;
}

export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  { size = "app", as, className, ...props },
  ref,
) {
  const Component = (as ?? "div") as ElementType;
  return (
    <Component
      ref={ref}
      className={cn("mx-auto w-full px-6 lg:px-8", SIZES[size], className)}
      {...props}
    />
  );
});
