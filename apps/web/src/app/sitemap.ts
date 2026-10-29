import type { MetadataRoute } from "next";
import { MARKETING_ROUTES, siteOrigin } from "@/lib/site";

/**
 * Marketing URLs only. Memorials are deliberately absent — a published memorial
 * is not automatically search-indexed (that is a separate family choice), and
 * enumerating them here would leak private URLs. A memorial sitemap, limited to
 * `public` + search-indexing-enabled memorials, is a separate future task.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteOrigin();
  const lastModified = new Date();

  return MARKETING_ROUTES.map((route) => ({
    url: `${base}${route === "/" ? "" : route}`,
    lastModified,
    changeFrequency: route === "/" ? "monthly" : "yearly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
