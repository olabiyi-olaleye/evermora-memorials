import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPublicStory, resolvePublicMemorial } from "@/lib/memorial";
import { StoryView } from "@/components/memorial/story-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublicMemorial(slug);

  // Nothing that isn't publicly visible may leak a name or story here.
  if (result.kind !== "ok") {
    return { title: "Their story", robots: { index: false, follow: false } };
  }

  const { memorial } = result;
  const indexable = memorial.visibility === "public" && memorial.searchIndexingEnabled;

  return {
    title: `Their story — ${memorial.fullName}`,
    description: memorial.headline ?? `The story of ${memorial.fullName}.`,
    alternates: { canonical: `/${memorial.canonicalSlug}/story` },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
  };
}

export default async function MemorialStoryPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await resolvePublicMemorial(slug);

  if (result.kind === "redirect") permanentRedirect(`${result.to}/story`);
  if (result.kind !== "ok") notFound();

  const { sections } = await getPublicStory(result.memorial.id);
  // Nothing to read in full that the main page's "Read More" wouldn't already
  // have skipped past — this page only exists to hold what didn't fit there.
  if (sections.length === 0) notFound();

  return <StoryView memorial={result.memorial} sections={sections} />;
}
