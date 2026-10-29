import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@evermora/ui";

/**
 * Marketing layout primitives. Editorial register: full-bleed bands with a
 * clamped inner measure, a deliberate ground-colour rhythm, hairline rules and
 * small-caps eyebrows in bronze. No cards, no shadows unless an element is
 * genuinely a self-contained object.
 */

type Ground = "canvas" | "surface" | "parchment" | "evergreen";

const GROUND: Record<Ground, string> = {
  canvas: "bg-canvas text-fg",
  surface: "bg-surface text-fg",
  parchment: "bg-surface-subtle text-fg",
  evergreen: "bg-brand text-on-brand",
};

export function Section({
  ground = "canvas",
  bordered = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { ground?: Ground; bordered?: boolean }) {
  return (
    <section
      className={cn(
        "px-6 py-20 md:py-28",
        GROUND[ground],
        bordered && "border-t border-line",
        className,
      )}
      {...props}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** Small-caps label in bronze, with an optional leading rule. */
export function Eyebrow({
  children,
  className,
  rule = true,
}: {
  children: ReactNode;
  className?: string;
  rule?: boolean;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-accent uppercase",
        className,
      )}
    >
      {rule ? <span aria-hidden className="h-px w-8 bg-accent/50" /> : null}
      {children}
    </p>
  );
}

/** A section title — Newsreader, balanced, with an optional lead paragraph. */
export function SectionTitle({
  as: As = "h2",
  children,
  lead,
  className,
}: {
  as?: ElementType;
  children: ReactNode;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", className)}>
      <As className="font-serif text-[clamp(1.75rem,1.2rem+2vw,2.5rem)] leading-[1.15] text-balance text-fg">
        {children}
      </As>
      {lead ? <p className="text-lg leading-relaxed text-fg-muted text-pretty">{lead}</p> : null}
    </div>
  );
}

/** Long-form copy at a reading measure. */
export function Prose({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[46rem] text-[1.0625rem] leading-[1.7] text-fg-muted",
        "[&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-fg",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A pull quote / principle statement in Newsreader italic. */
export function Statement({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-serif text-[clamp(1.5rem,1.1rem+1.6vw,2.125rem)] leading-[1.3] text-balance text-fg",
        className,
      )}
    >
      {children}
    </p>
  );
}
