"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@evermora/ui";

/**
 * The public memorial's quiet chrome: a slim name header that fades in once the
 * visitor has scrolled past the portrait, and — on small screens — a persistent
 * bar to share the page or jump to the tribute form. Ceremonial register: no
 * logo, no product navigation, nothing that competes with the person.
 */
export function MemorialChrome({ name, showTribute }: { name: string; showTribute: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolled(window.scrollY > 420));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const share = useCallback(async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // cancelled or unavailable — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // nothing sensible to do; the address bar still holds the link
    }
  }, [name]);

  return (
    <>
      <header
        inert={!scrolled || undefined}
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur",
          "transition duration-200 motion-reduce:transition-none",
          scrolled ? "visible translate-y-0 opacity-100" : "invisible -translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-[52rem] items-center justify-between gap-4 px-6">
          <p className="truncate font-serif text-[15px] leading-none text-fg">{name}</p>
          <div className="flex items-center gap-4">
            {showTribute ? (
              <a
                href="#leave-a-tribute"
                className="hidden text-[13px] font-medium text-brand hover:text-brand-hover sm:inline"
              >
                Leave a tribute
              </a>
            ) : null}
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:text-brand-hover"
            >
              {copied ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Share2 className="size-3.5" aria-hidden />
              )}
              {copied ? "Link copied" : "Share"}
            </button>
          </div>
        </div>
      </header>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex w-full max-w-[52rem] items-center gap-3 px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={share}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm border border-line-strong bg-raised text-sm font-medium text-fg"
          >
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Share2 className="size-4" aria-hidden />
            )}
            {copied ? "Link copied" : "Share"}
          </button>
          {showTribute ? (
            <a
              href="#leave-a-tribute"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-brand text-sm font-medium text-on-brand"
            >
              Leave a tribute
            </a>
          ) : null}
        </div>
      </div>
    </>
  );
}
