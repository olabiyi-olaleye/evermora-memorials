import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  formatBirthDate,
  formatLifespan,
  formatMemorialDate,
  initialsOf,
  truncateWords,
} from "@evermora/utils";
import type {
  PublicMemorial,
  PublicMilestone,
  PublicPhoto,
  PublicStorySection,
} from "@/lib/memorial";
import type { PublicFamilyUpdate, PublicFuneralEvent } from "@/lib/memorial";
import type { PublicTribute } from "@/lib/tributes";
import { siteOrigin } from "@/lib/site";
import { MemorialChrome } from "./memorial-chrome";
import { FuneralEvents } from "./funeral";
import { FamilyUpdates } from "./updates";

// Code-split: the interactive pieces of the page. A visitor to a quiet
// memorial (no tributes, no gallery) downloads none of this. `apps/web`
// "stays lightweight" is a locked performance principle.
const Tributes = dynamic(() => import("./tributes").then((m) => m.Tributes));
const Gallery = dynamic(() => import("./gallery").then((m) => m.Gallery));
const TributePrompt = dynamic(() => import("./tribute-prompt").then((m) => m.TributePrompt));

/**
 * The public memorial. An editorial, ceremonial reading experience — the
 * person's name and likeness lead; the story, timeline, photographs, family
 * updates, funeral information and tributes follow as distinct movements,
 * separated by bronze hairline rules rather than boxed into cards.
 *
 * Every part is rendered only when it exists, is enabled, and is visible to
 * this visitor — the resolution and privacy filtering happen upstream in
 * `app/[slug]/page.tsx` and the `@/lib/memorial` read layer.
 */
export function MemorialView({
  memorial,
  sections = [],
  milestones = [],
  portrait = null,
  photos = [],
  tributes = [],
  hasMoreTributes = false,
  funeralEvents = [],
  updates = [],
}: {
  memorial: PublicMemorial;
  sections?: PublicStorySection[];
  milestones?: PublicMilestone[];
  portrait?: PublicPhoto | null;
  photos?: PublicPhoto[];
  tributes?: PublicTribute[];
  /** True when more approved tributes exist than are in `tributes` — shows "View all". */
  hasMoreTributes?: boolean;
  funeralEvents?: PublicFuneralEvent[];
  updates?: PublicFamilyUpdate[];
}) {
  const lifespan = formatLifespan(memorial.dateOfBirth, memorial.dateOfDeath);
  const born = formatBirthDate(memorial.dateOfBirth, memorial.birthYearOnly);
  const died = formatMemorialDate(memorial.dateOfDeath);
  const hasDetails = Boolean(born || died || memorial.birthPlace || memorial.restingPlace);
  const showTributes = memorial.tributesEnabled || tributes.length > 0;
  // Disabled entirely (no events fetched either) → nothing, not even a
  // placeholder. Enabled with zero events is the "not announced yet" case
  // the placeholder exists for.
  const showFuneral = memorial.funeralEnabled || funeralEvents.length > 0;

  return (
    <>
      <MemorialChrome name={memorial.fullName} showTribute={memorial.tributesEnabled} />

      {memorial.tributesEnabled ? (
        <TributePrompt
          memorialId={memorial.id}
          personName={memorial.fullName}
          moderated={memorial.tributeModerationEnabled}
          gender={memorial.gender}
        />
      ) : null}

      <main id="main-content" className="mx-auto w-full max-w-[52rem] flex-1 px-6 pb-16">
        <Hero memorial={memorial} portrait={portrait} lifespan={lifespan} />

        {photos.length > 0 ? (
          <Movement eyebrow="Gallery" title="Photographs">
            <Gallery photos={photos} personName={memorial.fullName} />
          </Movement>
        ) : null}

        {sections.length > 0 ? (
          <TheirStory
            section={sections[0]!}
            hasMore={sections.length > 1}
            slug={memorial.canonicalSlug}
          />
        ) : null}

        <FamilyUpdates updates={updates} />

        {showFuneral ? (
          <FuneralEvents events={funeralEvents} planningStatus={memorial.funeralPlanningStatus} />
        ) : null}

        {milestones.length > 0 ? (
          <Movement eyebrow="Timeline" title="A life in moments">
            <ol className="relative flex flex-col gap-7 pl-5">
              <span aria-hidden className="absolute top-2 bottom-2 left-[3px] w-px bg-line" />
              {milestones.map((m) => (
                <li key={m.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute top-[6px] -left-5 size-2 rounded-full bg-accent ring-4 ring-canvas"
                  />
                  <p className="font-mono text-xs tracking-wide text-fg-subtle tabular-nums">
                    {m.onDate ? formatMemorialDate(m.onDate) : m.year}
                  </p>
                  <p className="mt-0.5 font-medium text-fg">{m.title}</p>
                  {m.description ? (
                    <p className="mt-0.5 max-w-[38rem] text-sm leading-relaxed text-fg-muted">
                      {m.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Movement>
        ) : null}

        {showTributes ? (
          <Tributes
            memorialId={memorial.id}
            tributes={tributes}
            hasMore={hasMoreTributes}
            slug={memorial.canonicalSlug}
            canSubmit={memorial.tributesEnabled}
            moderated={memorial.tributeModerationEnabled}
            gender={memorial.gender}
          />
        ) : null}

        {hasDetails ? (
          <Movement eyebrow="In summary" title="Details">
            <dl className="flex max-w-sm flex-col gap-3 text-sm">
              {born ? (
                <Detail
                  label="Born"
                  value={born + (memorial.birthPlace ? `, ${memorial.birthPlace}` : "")}
                />
              ) : memorial.birthPlace ? (
                <Detail label="Born in" value={memorial.birthPlace} />
              ) : null}
              {died ? <Detail label="Died" value={died} /> : null}
              {memorial.restingPlace ? (
                <Detail label="Resting place" value={memorial.restingPlace} />
              ) : null}
            </dl>
          </Movement>
        ) : null}
      </main>

      <footer className="mt-20 border-t border-line pt-8 pb-28 text-center lg:pb-12">
        <a
          href={`${siteOrigin()}/`}
          className="font-serif text-sm text-fg-subtle transition-colors hover:text-fg"
        >
          Made with Evermora
        </a>
      </footer>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Hero({
  memorial,
  portrait,
  lifespan,
}: {
  memorial: PublicMemorial;
  portrait: PublicPhoto | null;
  lifespan: string | null;
}) {
  const identity = (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
        In loving memory
      </p>
      <h1 className="mt-3 font-serif text-[clamp(2rem,1.4rem+3vw,3.25rem)] leading-[1.08] text-balance text-fg">
        {memorial.fullName}
      </h1>
      {memorial.preferredName ? (
        <p className="mt-2 font-serif text-lg text-fg-muted italic">
          &ldquo;{memorial.preferredName}&rdquo;
        </p>
      ) : null}
      {lifespan ? (
        <p className="mt-3 font-mono text-sm tracking-wide text-fg-subtle">{lifespan}</p>
      ) : null}
      {memorial.headline ? (
        <p className="mt-6 max-w-[34rem] font-serif text-[clamp(1.125rem,1rem+0.6vw,1.4rem)] leading-[1.45] text-balance text-fg-muted">
          {memorial.headline}
        </p>
      ) : null}
      {memorial.survivedBy ? (
        <div className="mt-6 max-w-[34rem]">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
            Survived by
          </p>
          <p className="mt-1.5 text-[15px] leading-[1.6] text-fg-muted">{memorial.survivedBy}</p>
        </div>
      ) : null}
    </div>
  );

  if (portrait?.url) {
    return (
      <header className="grid gap-8 pt-14 sm:pt-20 lg:grid-cols-[17rem_1fr] lg:items-center lg:gap-12">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
        <img
          src={portrait.url}
          alt={portrait.altText ?? portrait.caption ?? memorial.fullName}
          width={portrait.width ?? undefined}
          height={portrait.height ?? undefined}
          className="aspect-[4/5] w-full max-w-[15rem] justify-self-center rounded-2xl object-cover shadow-e2 lg:max-w-none lg:justify-self-start"
        />
        {identity}
      </header>
    );
  }

  return (
    <header className="pt-14 sm:pt-20">
      <div className="flex flex-col items-start gap-7 rounded-2xl bg-surface-subtle px-6 py-12 sm:flex-row sm:items-center sm:gap-9 sm:px-10 sm:py-14">
        <span
          aria-hidden
          className="inline-flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-soft font-serif text-3xl font-medium text-brand-hover"
        >
          {initialsOf(memorial.fullName)}
        </span>
        {identity}
      </div>
    </header>
  );
}

function Movement({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-16 border-t border-accent/25 pt-10 sm:mt-20 sm:pt-14">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] text-fg">{title}</h2>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-line pb-2 last:border-0">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="text-right text-fg-muted">{value}</dd>
    </div>
  );
}

const STORY_PREVIEW_WORD_LIMIT = 70;

/**
 * The main page shows only the beginning of the first story section — a
 * taste, not the whole thing — so the page doesn't run long for a visitor
 * just passing through. "Read more" leads to `/[slug]/story` (`story-view.tsx`),
 * which shows every section in full, including this one.
 */
function TheirStory({
  section,
  hasMore,
  slug,
}: {
  section: PublicStorySection;
  hasMore: boolean;
  slug: string;
}) {
  const { excerpt, truncated } = truncateWords(section.body, STORY_PREVIEW_WORD_LIMIT);
  // Read More is worth showing whenever there's more to read than what's
  // here — either this section itself got cut, or later sections didn't
  // make the main page at all.
  const showReadMore = truncated || hasMore;

  return (
    <Movement eyebrow="Their story" title={section.title}>
      <p className="text-justify leading-[1.75] whitespace-pre-line text-fg-muted">{excerpt}</p>
      {showReadMore ? (
        <a
          href={`/${slug}/story`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover"
        >
          Read more
        </a>
      ) : null}
    </Movement>
  );
}
