import type { ReactNode } from "react";
import { cn } from "@evermora/ui";

/**
 * Abstract memorial motifs — typographic and drawn, never a photograph. The
 * "memorial preview" is a clearly fictional sample (Adaeze Nwosu), styled like
 * a real memorial card so a visitor understands what Evermora makes, without
 * borrowing anyone's likeness.
 */

export function Monogram({
  initials,
  className,
  size = "md",
}: {
  initials: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "size-10 text-base", md: "size-14 text-xl", lg: "size-20 text-3xl" }[size];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl bg-brand-soft font-serif font-medium text-brand-hover",
        dims,
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Decorative QR-code glyph. Not scannable — a visual reference to the concept. */
export function QrGlyph({ className }: { className?: string }) {
  // A fixed 7×7 pattern with the three finder squares, drawn as rects.
  const cells = ["1111111", "1000101", "1011101", "1011001", "1010111", "1000011", "1111101"];
  return (
    <svg
      viewBox="0 0 7 7"
      className={cn("size-full", className)}
      role="img"
      aria-label="QR code"
      shapeRendering="crispEdges"
    >
      <rect width="7" height="7" fill="var(--color-raised)" />
      {cells.flatMap((row, y) =>
        row
          .split("")
          .map((c, x) =>
            c === "1" ? (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
            ) : null,
          ),
      )}
    </svg>
  );
}

export function MemorialAddress({
  slug = "adaeze-nwosu",
  className,
}: {
  slug?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-canvas px-2.5 py-1 font-mono text-[0.8125rem] text-fg-muted ring-1 ring-line",
        className,
      )}
    >
      evermora.com/{slug}
    </span>
  );
}

/** The fictional sample memorial card used in the hero and features. */
export function MemorialPreviewCard({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-raised p-6 shadow-e2",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <Monogram initials="AN" size="md" />
        <div className="min-w-0">
          <p className="font-serif text-xl leading-tight text-fg">Adaeze Nwosu</p>
          <p className="font-mono text-[0.8125rem] text-fg-subtle">1946 – 2024</p>
        </div>
      </div>
      <p className="border-l-2 border-accent/40 pl-3 font-serif text-[0.95rem] leading-relaxed text-fg-muted italic">
        &ldquo;She taught half the town to bake, and never once used a recipe.&rdquo;
        <span className="mt-1 block font-sans text-xs text-fg-subtle not-italic">
          — Requested by her granddaughter
        </span>
      </p>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <MemorialAddress />
        <span aria-hidden className="size-9 text-brand">
          <QrGlyph />
        </span>
      </div>
      <figcaption className="sr-only">
        A sample memorial page for a fictional person, Adaeze Nwosu.
      </figcaption>
    </figure>
  );
}

/** A short vertical timeline fragment — a few dated moments. */
export function TimelineFragment({ className, count = 4 }: { className?: string; count?: number }) {
  const items = [
    { year: "1946", label: "Born in Enugu" },
    { year: "1969", label: "Married Emeka" },
    { year: "1974", label: "Opened the bakery" },
    { year: "2024", label: "Four generations" },
  ].slice(0, count);
  return (
    <ol className={cn("relative flex flex-col gap-3.5 pl-4", className)}>
      <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-line" />
      {items.map((it) => (
        <li key={it.year} className="relative">
          <span
            aria-hidden
            className="absolute top-[7px] -left-4 size-[7px] rounded-full bg-accent ring-4 ring-raised"
          />
          <p className="font-mono text-[11px] leading-tight text-fg-subtle">{it.year}</p>
          <p className="text-[13px] leading-tight text-fg-muted">{it.label}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The hero's right column — a deliberately layered composition, all contained
 * within its own box: a parchment panel offset behind, the sample memorial
 * card, and a small timeline card overlapping its lower-left corner.
 */
export function HeroComposition({ children }: { children?: ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[24rem] pb-4 lg:mr-0 lg:ml-auto">
      <div
        aria-hidden
        className="absolute -top-5 -right-5 h-32 w-32 rounded-3xl bg-surface-subtle"
      />
      <div className="relative flex flex-col items-end">
        <MemorialPreviewCard />
        <div className="relative -mt-5 -ml-6 mr-auto w-54 rounded-xl border border-line bg-raised p-4 shadow-e2">
          <p className="mb-2.5 text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
            A life in moments
          </p>
          <TimelineFragment count={3} />
        </div>
        {children}
      </div>
    </div>
  );
}
