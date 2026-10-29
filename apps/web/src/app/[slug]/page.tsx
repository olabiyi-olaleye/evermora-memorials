import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getPublicFuneral,
  getPublicGallery,
  getPublicStory,
  getPublicUpdates,
  resolvePublicMemorial,
} from "@/lib/memorial";
import { getPublicTributesPreview } from "@/lib/tributes";
import { SHARE_IMAGE_SIZE, shareImageVersion } from "@/lib/share-image";
import { MemorialView } from "@/components/memorial/memorial-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** How many of the most recent tributes show inline before "View all" takes over. */
const TRIBUTES_INLINE_LIMIT = 5;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublicMemorial(slug);

  // Nothing that isn't publicly visible may leak a name, dates, or story here.
  if (result.kind !== "ok") {
    return { title: "Memorial", robots: { index: false, follow: false } };
  }

  const { memorial } = result;
  const name = memorial.fullName;
  const indexable = memorial.visibility === "public" && memorial.searchIndexingEnabled;

  // Next's file-convention opengraph-image.tsx/twitter-image.tsx route gets
  // auto-wired to a URL whose hash comes from the route's static config
  // (size/contentType/alt), not the memorial's actual photo — so it never
  // changes when a family picks a new cover, and platforms like WhatsApp
  // that already cached the old image keep serving it indefinitely. Pointing
  // at the same routes ourselves with a `v` fingerprinting what's drawn into
  // the image forces a new URL (and a fresh fetch) every time it changes.
  const v = await shareImageVersion(memorial);

  return {
    title: name,
    description: memorial.headline ?? `In loving memory of ${name}.`,
    alternates: { canonical: `/${memorial.canonicalSlug}` },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    openGraph: {
      type: "profile",
      title: name,
      description: memorial.headline ?? `In loving memory of ${name}.`,
      url: `/${memorial.canonicalSlug}`,
      images: [
        {
          url: `/${memorial.canonicalSlug}/opengraph-image?v=${v}`,
          width: SHARE_IMAGE_SIZE.width,
          height: SHARE_IMAGE_SIZE.height,
          alt: "A memorial on Evermora",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: memorial.headline ?? `In loving memory of ${name}.`,
      images: [`/${memorial.canonicalSlug}/twitter-image?v=${v}`],
    },
  };
}

export default async function MemorialPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await resolvePublicMemorial(slug);

  if (result.kind === "redirect") permanentRedirect(result.to);
  if (result.kind !== "ok") notFound();

  const [story, gallery, tributesPreview, funeralEvents, updates] = await Promise.all([
    getPublicStory(result.memorial.id),
    getPublicGallery(
      result.memorial.id,
      result.memorial.portraitMediaId,
      result.memorial.coverMediaId,
    ),
    getPublicTributesPreview(result.memorial.id, TRIBUTES_INLINE_LIMIT),
    result.memorial.funeralEnabled ? getPublicFuneral(result.memorial.id) : Promise.resolve([]),
    result.memorial.updatesEnabled ? getPublicUpdates(result.memorial.id) : Promise.resolve([]),
  ]);

  return (
    <MemorialView
      memorial={result.memorial}
      sections={story.sections}
      milestones={story.milestones}
      portrait={gallery.portrait}
      photos={gallery.photos}
      tributes={tributesPreview.tributes}
      hasMoreTributes={tributesPreview.hasMore}
      funeralEvents={funeralEvents}
      updates={updates}
    />
  );
}
