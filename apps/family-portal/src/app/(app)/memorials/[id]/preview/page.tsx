/* eslint-disable @next/next/no-img-element -- signed Storage URL */
import type { Metadata } from "next";
import Link from "next/link";
import { getMemorialFuneral } from "@/lib/data/funeral";
import { getMemorialDetail } from "@/lib/data/memorials";
import { getMemorialGallery } from "@/lib/data/media";
import { getMemorialStory } from "@/lib/data/story";
import { getMemorialTributes } from "@/lib/data/tributes";
import { getMemorialUpdates } from "@/lib/data/updates";
import {
  formatBirthDate,
  formatClockTime,
  funeralPlaceholderCopy,
  truncateWords,
} from "@evermora/utils";
import type { FuneralPlanningStatus } from "@evermora/types";
import { formatDate, formatLifespan } from "@/lib/format";
import { serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Preview" };

const STORY_PREVIEW_WORD_LIMIT = 70;
const TRIBUTES_INLINE_LIMIT = 5;

/**
 * Family-side preview of the memorial. It approximates the public page inside
 * the authenticated portal — there is no authenticated draft preview on
 * evermora.com — so it mirrors the real page's actual section order and
 * behaviour (hero → gallery → Their Story excerpt → updates → funeral →
 * timeline → tributes → details), not a layout of its own invention.
 */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const memorial = await getMemorialDetail(id);
  if (!memorial) return null;

  const { profile } = memorial;
  const lifespan = formatLifespan(profile.dateOfBirth, profile.dateOfDeath);
  const born = formatBirthDate(profile.dateOfBirth, profile.birthYearOnly);
  const died = formatDate(profile.dateOfDeath);

  const [story, gallery, funeral, allUpdates, allTributes] = await Promise.all([
    getMemorialStory(id),
    getMemorialGallery(id),
    getMemorialFuneral(id),
    getMemorialUpdates(id),
    getMemorialTributes(id),
  ]);
  // Preview shows exactly what a visitor sees: published / approved content only.
  const sections = story.sections.filter((s) => s.status === "published");
  const milestones = story.milestones.filter((m) => m.status === "published");
  const updates = allUpdates.filter(
    (u) => u.status === "published" && ["inherit", "public"].includes(u.visibility),
  );
  const funeralEvents = funeral.events.filter(
    (e) =>
      (e.status === "published" || e.status === "cancelled") &&
      ["inherit", "public"].includes(e.visibility),
  );
  const approvedTributes = allTributes.filter((t) => t.status === "approved");
  // Mirrors the public page: the most recent few inline, "View all" for the rest.
  const tributes = approvedTributes.slice(0, TRIBUTES_INLINE_LIMIT);
  const hasMoreTributes = approvedTributes.length > TRIBUTES_INLINE_LIMIT;
  const portrait = gallery.photos.find((p) => p.id === gallery.portraitMediaId) ?? null;
  const galleryPhotos = gallery.photos.filter(
    (p) => p.albumId && gallery.albums.some((a) => a.id === p.albumId && a.status === "published"),
  );

  // "Their Story" mirrors the public page: only the first published section,
  // truncated, with "Read more" — a real link once the memorial is actually
  // live (there's nowhere else for it to point to before then).
  const firstSection = sections[0] ?? null;
  const storyExcerpt = firstSection
    ? truncateWords(firstSection.body, STORY_PREVIEW_WORD_LIMIT)
    : null;
  const showStoryReadMore = storyExcerpt ? storyExcerpt.truncated || sections.length > 1 : false;
  // Same logic as the public page: disabled entirely → nothing; enabled with
  // no events yet → a placeholder phrased from the family's own planning
  // status (null once it's "completed" — nothing left to announce).
  const showFuneral = memorial.features.funeralEnabled || funeralEvents.length > 0;
  const funeralPlaceholder =
    funeralEvents.length === 0
      ? funeralPlaceholderCopy(memorial.funeralPlanningStatus as FuneralPlanningStatus)
      : null;
  const appUrl = serverEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const storyUrl =
    memorial.status === "published" && memorial.canonicalSlug
      ? `${appUrl}/${memorial.canonicalSlug}/story`
      : null;
  const tributesUrl =
    memorial.status === "published" && memorial.canonicalSlug
      ? `${appUrl}/${memorial.canonicalSlug}/tributes`
      : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-2.5">
        <p className="text-[13px] text-fg-muted">
          {memorial.status === "published"
            ? `Live at evermora.com/${memorial.canonicalSlug ?? ""}`
            : "Draft preview — this is what a visitor will see once you publish."}
        </p>
        <Link
          href={`/memorials/${memorial.id}/edit`}
          className="text-[13px] font-medium text-brand hover:text-brand-hover"
        >
          Edit details
        </Link>
      </div>

      <article className="rounded-xl border border-line bg-canvas px-6 py-12 text-center sm:px-12">
        <p className="text-xs font-medium tracking-[0.2em] text-fg-subtle uppercase">
          In loving memory
        </p>
        {portrait?.url ? (
          <img
            src={portrait.url}
            alt={portrait.altText ?? profile.fullName}
            className="mx-auto mt-6 h-32 w-32 rounded-full object-cover"
          />
        ) : null}
        <h1 className="mt-4 font-serif text-3xl text-fg">{profile.fullName}</h1>
        {profile.preferredName ? (
          <p className="mt-1 text-sm text-fg-subtle">“{profile.preferredName}”</p>
        ) : null}
        {lifespan ? <p className="mt-3 text-sm text-fg-subtle">{lifespan}</p> : null}
        {profile.headline ? (
          <p className="mx-auto mt-6 max-w-md text-base text-fg-muted">{profile.headline}</p>
        ) : null}

        {profile.survivedBy ? (
          <div className="mx-auto mt-6 max-w-md">
            <p className="text-xs font-medium tracking-[0.2em] text-fg-subtle uppercase">
              Survived by
            </p>
            <p className="mt-1.5 text-sm text-fg-muted">{profile.survivedBy}</p>
          </div>
        ) : null}

        {galleryPhotos.length > 0 ? (
          <div className="mx-auto mt-10 max-w-prose border-t border-line pt-8">
            <h2 className="text-center font-serif text-lg text-fg">Photographs</h2>
            <ul className="mt-6 grid grid-cols-3 gap-2">
              {galleryPhotos.map((p) => (
                <li key={p.id}>
                  <img
                    src={p.url ?? ""}
                    alt={p.altText ?? p.caption ?? ""}
                    className="aspect-square w-full rounded object-cover"
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {firstSection && storyExcerpt ? (
          <div className="mx-auto mt-10 max-w-prose border-t border-line pt-8 text-left">
            <h2 className="font-serif text-lg text-fg">{firstSection.title}</h2>
            <p className="mt-2 text-justify text-sm leading-relaxed whitespace-pre-line text-fg-muted">
              {storyExcerpt.excerpt}
            </p>
            {showStoryReadMore ? (
              storyUrl ? (
                <a
                  href={storyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-hover"
                >
                  Read more
                </a>
              ) : (
                <p className="mt-3 text-xs text-fg-subtle">
                  Continues once published — visitors will be able to read the rest on the full
                  story page.
                </p>
              )
            ) : null}
          </div>
        ) : null}

        {updates.length > 0 ? (
          <div className="mx-auto mt-10 max-w-prose border-t border-line pt-8 text-left">
            <h2 className="text-center font-serif text-lg text-fg">From the family</h2>
            <ul className="mt-6 flex flex-col gap-4">
              {updates.map((u) => (
                <li key={u.id} className="text-sm">
                  <span className="block font-medium text-fg">
                    {u.title}
                    {u.importance !== "normal" ? (
                      <span className="ml-2 rounded-full bg-warn-soft text-[#7a5313]">
                        {u.importance === "urgent" ? "Urgent" : "Important"}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block whitespace-pre-line text-fg-muted">{u.body}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {showFuneral && funeralEvents.length > 0 ? (
          <div className="mx-auto mt-10 max-w-prose border-t border-line pt-8 text-left">
            <h2 className="text-center font-serif text-lg text-fg">Funeral arrangements</h2>
            <ul className="mt-6 flex flex-col gap-4">
              {funeralEvents.map((e) => {
                const start = formatClockTime(e.startTime);
                const when = e.eventDate
                  ? formatDate(e.eventDate) + (start ? `, ${start}` : "")
                  : null;
                const place = [e.venueName, e.addressLine, e.city].filter(Boolean).join(", ");
                return (
                  <li key={e.id} className="text-sm">
                    <span className="block font-medium text-fg">
                      {e.title}
                      {e.status === "cancelled" ? (
                        <span className="ml-2 rounded-full bg-bad-soft px-2 py-0.5 text-xs text-[#832e28]">
                          Cancelled
                        </span>
                      ) : null}
                    </span>
                    {e.status !== "cancelled" && when ? (
                      <span className="block text-fg-muted">{when}</span>
                    ) : null}
                    {e.status !== "cancelled" && place ? (
                      <span className="block text-fg-muted">{place}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : showFuneral && funeralPlaceholder ? (
          <div className="mx-auto mt-10 max-w-prose border-t border-line pt-8 text-left">
            <h2 className="text-center font-serif text-lg text-fg">Funeral arrangements</h2>
            <p className="mt-4 text-sm text-fg-muted">{funeralPlaceholder}</p>
          </div>
        ) : null}

        {milestones.length > 0 ? (
          <div className="mx-auto mt-10 max-w-prose border-t border-line pt-8 text-left">
            <h2 className="text-center font-serif text-lg text-fg">A life in moments</h2>
            <ol className="mt-6 flex flex-col gap-4">
              {milestones.map((m) => (
                <li key={m.id} className="grid grid-cols-[4rem_1fr] gap-3 text-sm">
                  <span className="text-right text-fg-subtle tabular-nums">
                    {m.onDate ? formatDate(m.onDate) : m.year}
                  </span>
                  <span>
                    <span className="block font-medium text-fg">{m.title}</span>
                    {m.description ? (
                      <span className="mt-0.5 block text-fg-muted">{m.description}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {tributes.length > 0 ? (
          <div className="mx-auto mt-10 max-w-prose border-t border-line pt-8 text-left">
            <h2 className="text-center font-serif text-lg text-fg">Tributes</h2>
            <ul className="mt-6 flex flex-col gap-6">
              {tributes.map((t) => (
                <li key={t.id} className="border-l-2 border-line pl-4 text-sm">
                  <p className="whitespace-pre-line text-fg-muted italic">{t.message}</p>
                  <p className="mt-1 text-xs text-fg-subtle not-italic">
                    — {t.authorDisplayName}
                    {t.authorRelationship ? `, ${t.authorRelationship}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            {hasMoreTributes ? (
              tributesUrl ? (
                <a
                  href={tributesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-hover"
                >
                  View all tributes
                </a>
              ) : (
                <p className="mt-3 text-xs text-fg-subtle">
                  More tributes will be visible on the full page once published.
                </p>
              )
            ) : null}
          </div>
        ) : (
          <p className="mx-auto mt-10 max-w-prose border-t border-line pt-8 text-center text-xs text-fg-subtle">
            Tributes appear here as visitors leave them.
          </p>
        )}

        {(born || died || profile.birthPlace || profile.restingPlace) && (
          <dl className="mx-auto mt-10 grid max-w-sm gap-2 border-t border-line pt-8 text-left text-sm text-fg-muted">
            {born ? (
              <Row
                label="Born"
                value={born + (profile.birthPlace ? `, ${profile.birthPlace}` : "")}
              />
            ) : null}
            {died ? <Row label="Died" value={died} /> : null}
            {profile.restingPlace ? (
              <Row label="Resting place" value={profile.restingPlace} />
            ) : null}
          </dl>
        )}
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-1">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="text-right text-fg-muted">{value}</dd>
    </div>
  );
}
