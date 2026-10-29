import { ArrowLeft } from "lucide-react";
import type { PublicMemorial, PublicStorySection } from "@/lib/memorial";
import { MemorialChrome } from "./memorial-chrome";

/**
 * The dedicated "Their story" page — every story section, in full. The main
 * memorial page only ever shows a word-limited excerpt of the first section
 * (`memorial-view.tsx`'s `TheirStory`); this is where "Read More" leads.
 * Same chrome, typography and section styling as the main page's own story
 * block, just not truncated.
 */
export function StoryView({
  memorial,
  sections,
}: {
  memorial: PublicMemorial;
  sections: PublicStorySection[];
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
            Their story
          </p>
          <h1 className="mt-3 font-serif text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] leading-[1.1] text-balance text-fg">
            {memorial.fullName}
          </h1>
        </div>

        <div className="mt-12 flex flex-col gap-12 sm:mt-16">
          {sections.map((s) => (
            <div key={s.id}>
              <h2 className="font-serif text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] text-fg">
                {s.title}
              </h2>
              <p className="mt-4 text-justify leading-[1.75] whitespace-pre-line text-fg-muted">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
