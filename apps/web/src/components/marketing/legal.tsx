import type { ReactNode } from "react";
import { Eyebrow } from "./primitives";

/**
 * Shared shell for the /privacy and /terms pages — a single reading column with
 * a clear heading hierarchy. Content is plain-language and reflects how the
 * product actually behaves.
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="bg-canvas px-6 py-20 md:py-28">
      <div className="mx-auto w-full max-w-[46rem]">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-5 font-serif text-[clamp(2rem,1.6rem+2vw,2.75rem)] leading-[1.12] text-balance text-fg">
          {title}
        </h1>
        <p className="mt-3 font-mono text-xs text-fg-subtle">Last updated {updated}</p>
        <div className="mt-8 text-[1.0625rem] leading-[1.75] text-fg-muted">{intro}</div>

        <div className="mt-10 flex flex-col gap-10 [&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-fg [&_h2+p]:mt-3 [&_li]:leading-relaxed [&_p]:mt-3 [&_p:first-child]:mt-0 [&_ul]:mt-3 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </article>
  );
}
