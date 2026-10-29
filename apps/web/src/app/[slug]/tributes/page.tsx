import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolvePublicMemorial } from "@/lib/memorial";
import { getPublicTributes } from "@/lib/tributes";
import { TributesView } from "@/components/memorial/tributes-view";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublicMemorial(slug);

  // Nothing that isn't publicly visible may leak a name or tribute here.
  if (result.kind !== "ok") {
    return { title: "Tributes", robots: { index: false, follow: false } };
  }

  const { memorial } = result;
  const indexable = memorial.visibility === "public" && memorial.searchIndexingEnabled;

  return {
    title: `Tributes for ${memorial.fullName}`,
    description: memorial.headline ?? `Tributes for ${memorial.fullName}.`,
    alternates: { canonical: `/${memorial.canonicalSlug}/tributes` },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
  };
}

export default async function MemorialTributesPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await resolvePublicMemorial(slug);

  if (result.kind === "redirect") permanentRedirect(`${result.to}/tributes`);
  if (result.kind !== "ok") notFound();

  const tributes = await getPublicTributes(result.memorial.id);
  // Nothing here that the main page's preview wouldn't already have shown —
  // this page only exists to hold what didn't fit there.
  if (tributes.length === 0) notFound();

  return <TributesView memorial={result.memorial} tributes={tributes} />;
}
