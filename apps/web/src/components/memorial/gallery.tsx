"use client";

/* eslint-disable @next/next/no-img-element -- gallery images are short-lived
   signed URLs from Supabase Storage; next/image can't cache them usefully. */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PublicPhoto } from "@/lib/memorial";

/**
 * The photograph grid and its lightbox. Loaded on demand (code-split from
 * `memorial-view`) so a memorial with no gallery ships none of this JS.
 * The lightbox is keyboard-operable (← → to move, Esc to close), traps focus
 * while open, locks body scroll, and restores focus to the opening thumbnail.
 * Motion is left to CSS, which already honours `prefers-reduced-motion`.
 */
export function Gallery({ photos, personName }: { photos: PublicPhoto[]; personName: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const show = useCallback((i: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setIndex(i);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    openerRef.current?.focus();
  }, []);

  const step = useCallback(
    (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, close, step]);

  const active = photos[index];

  return (
    <>
      <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={(e) => show(i, e.currentTarget)}
              className="group block w-full overflow-hidden rounded-md ring-1 ring-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label={p.caption ?? p.altText ?? `Open photograph ${i + 1} of ${photos.length}`}
            >
              <img
                src={p.url ?? ""}
                alt={p.altText ?? p.caption ?? `A photograph from ${personName}'s life`}
                width={p.width ?? undefined}
                height={p.height ?? undefined}
                loading="lazy"
                className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </button>
          </li>
        ))}
      </ul>

      {open && active ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-fg/92 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Photograph ${index + 1} of ${photos.length}${
            active.caption ? `: ${active.caption}` : ""
          }`}
          ref={dialogRef}
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-on-brand/80">
            <span className="font-mono text-xs tabular-nums">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="inline-flex size-9 items-center justify-center rounded-full text-on-brand/80 hover:bg-white/10 hover:text-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-center gap-2 px-2 pb-2 sm:gap-4 sm:px-4">
            {photos.length > 1 ? (
              <button
                type="button"
                onClick={() => step(-1)}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-on-brand/80 hover:bg-white/10 hover:text-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Previous photograph"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
            ) : null}

            <figure className="flex min-w-0 flex-col items-center gap-3">
              <img
                src={active.url ?? ""}
                alt={active.altText ?? active.caption ?? `A photograph from ${personName}'s life`}
                width={active.width ?? undefined}
                height={active.height ?? undefined}
                className="max-h-[76vh] w-auto max-w-full rounded-sm object-contain shadow-e3"
              />
              {active.caption ? (
                <figcaption className="max-w-prose text-center text-sm text-on-brand/80">
                  {active.caption}
                </figcaption>
              ) : null}
            </figure>

            {photos.length > 1 ? (
              <button
                type="button"
                onClick={() => step(1)}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-on-brand/80 hover:bg-white/10 hover:text-on-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Next photograph"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
