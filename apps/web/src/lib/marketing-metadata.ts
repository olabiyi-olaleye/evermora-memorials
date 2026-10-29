import type { Metadata } from "next";

/**
 * Metadata for a marketing page. Title flows through the root layout's
 * `%s · Evermora` template; description drives the meta + OG + Twitter text;
 * the path sets a canonical and the OG url.
 */
export function marketingMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · Evermora`, description, url: path },
    twitter: { title: `${title} · Evermora`, description },
  };
}
