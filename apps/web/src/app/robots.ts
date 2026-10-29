import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

/**
 * Marketing is crawlable. The QR resolver namespace is not (it only ever
 * redirects). Individual memorials are governed per-page by `generateMetadata`
 * in `[slug]/page.tsx` — a published memorial is still `noindex` unless the
 * family turned on search indexing — so robots stays permissive here and the
 * page-level directive is the gate.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/q/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
