"use client";

import * as RAvatar from "@radix-ui/react-avatar";
import { forwardRef } from "react";
import { cn } from "./cn";

export interface AvatarProps {
  /** Full name — used for the fallback initials and the accessible label. */
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Avatar — image with an initials fallback in the brand-soft tint. */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { name, src, size = "md", className },
  ref,
) {
  return (
    <RAvatar.Root
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-semibold text-brand-hover select-none",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-[34px] text-[13px]",
        size === "lg" && "size-11 text-base",
        className,
      )}
    >
      {src ? <RAvatar.Image src={src} alt="" className="size-full object-cover" /> : null}
      <RAvatar.Fallback delayMs={src ? 300 : 0}>{initials(name) || "?"}</RAvatar.Fallback>
    </RAvatar.Root>
  );
});
