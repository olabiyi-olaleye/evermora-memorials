import { ArrowLeft } from "lucide-react";
import { formatMemorialDate } from "@evermora/utils";
import type { PublicMemorial } from "@/lib/memorial";
import type { PublicTribute } from "@/lib/tributes";
import { MemorialChrome } from "./memorial-chrome";

/**
 * The dedicated "Tributes" page — every approved tribute, in full. The main
 * memorial page only ever shows the most recent few (`memorial-view.tsx`'s
 * `Tributes`); this is where "View all tributes" leads. Same chrome and
 * typography as the main page's own list, just not limited.
 */
export function TributesView({
  memorial,
  tributes,
}: {
  memorial: PublicMemorial;
  tributes: PublicTribute[];
}) {
  return (
    <>
      <MemorialChrome name={memorial.fullName} showTribute={false} />

      <main id="main-content" className="mx-auto w-full max-w-[52rem] flex-1 px-6 pb-16">
        <div className="pt-14 sm:pt-20">
          <a
            href={`/${memorial.canonicalSlug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to {memorial.fullName}&rsquo;s memorial
          </a>
          <p className="mt-8 text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
            Remembrance
          </p>
          <h1 className="mt-3 font-serif text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] leading-[1.1] text-balance text-fg">
            Tributes for {memorial.fullName}
          </h1>
        </div>

        <ul className="mt-12 flex flex-col gap-8 sm:mt-16">
          {tributes.map((t) => (
            <li key={t.id} className="border-l-2 border-accent/40 pl-4">
              <p className="font-serif text-[1.0625rem] leading-[1.6] text-justify text-balance whitespace-pre-line text-fg-muted italic">
                {t.message}
              </p>
              <p className="mt-2 text-sm text-fg-subtle not-italic">
                — {t.authorDisplayName}
                {t.authorRelationship ? `, ${t.authorRelationship}` : ""}
                {formatMemorialDate(t.createdAt) ? ` · ${formatMemorialDate(t.createdAt)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
