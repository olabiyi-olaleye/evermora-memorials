import { renderMemorialShareImage } from "@/lib/share-image";

// A plain Route Handler, not Next's opengraph-image.tsx file convention —
// that convention's URL is hashed from the route's static config, never
// changes when a memorial's cover photo does, and (being file-based)
// silently wins over any `openGraph.images` set in generateMetadata. This
// route lives at the same URL; the caller (generateMetadata in ../page.tsx)
// appends a `v` tied to the chosen photo so the URL itself changes whenever
// it does, forcing platforms like WhatsApp to fetch fresh instead of serving
// a stale cached image.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  return renderMemorialShareImage(slug);
}
