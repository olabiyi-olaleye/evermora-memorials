/**
 * Marketing site configuration — the single source for nav, footer, and the
 * canonical copy that appears in more than one place. Route lists here are
 * mirrored by `sitemap.ts`; keep them in sync.
 */

export const SITE_NAME = "Evermora";

/**
 * The site's own public origin, for canonical URLs, the sitemap and robots.
 * Reads the public env with a safe fallback so a build without the var (e.g. a
 * Vercel preview) still succeeds — `metadataBase` then makes per-page canonicals
 * absolute at request time.
 */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** The family portal origin — target of the `/create` and `/signin` redirects. */
export function familyOrigin(): string {
  return (process.env.NEXT_PUBLIC_FAMILY_URL ?? "http://localhost:3001").replace(/\/$/, "");
}
export const SITE_TAGLINE = "A lasting place to remember someone you love.";
export const SITE_DESCRIPTION =
  "Evermora is a family-controlled digital remembrance platform. One person, one memorial, one permanent link — for their story, photos, tributes, funeral information and family updates.";

/** Primary marketing navigation (header). Only routes that exist. */
export const PRIMARY_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "Features" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
] as const;

/** Every indexable marketing page, for the sitemap. */
export const MARKETING_ROUTES = [
  "/",
  "/how-it-works",
  "/features",
  "/about",
  "/services",
  "/support",
  "/privacy",
  "/terms",
] as const;

export const FOOTER_NAV = [
  {
    heading: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/features", label: "Features" },
      { href: "/services", label: "Services" },
    ],
  },
  {
    heading: "Company",
    links: [{ href: "/about", label: "About" }],
  },
  {
    heading: "Support",
    links: [{ href: "/support", label: "Help & support" }],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    heading: "Families",
    links: [
      { href: "/create", label: "Create a memorial" },
      { href: "/signin", label: "Sign in" },
    ],
  },
] as const;

/**
 * First-party CTA routes. `/create` and `/signin` are thin redirects into the
 * family portal (see `app/create/route.ts`) — marketing links point here, never
 * at the portal URL directly, so the family origin stays a single env value.
 */
export const CTA = {
  create: "/create",
  signIn: "/signin",
} as const;
