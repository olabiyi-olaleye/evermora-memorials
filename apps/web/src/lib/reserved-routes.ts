/**
 * Routing-layer mirror of the `reserved_slugs` table
 * (`supabase/migrations/*_slugs.sql`). A single-segment request matching one of
 * these is never a memorial — the public route treats it as not-found so a
 * memorial can never shadow a platform route, even before that route exists as
 * a real page.
 *
 * Keep this in sync with the migration (documented in
 * `docs/architecture/memorial-url-architecture.md`).
 */
export const RESERVED_ROUTES: ReadonlySet<string> = new Set([
  // marketing / product
  "about",
  "contact",
  "pricing",
  "services",
  "privacy",
  "terms",
  "support",
  "help",
  "how-it-works",
  "features",
  "blog",
  "faq",
  "careers",
  "press",
  // auth / account
  "login",
  "logout",
  "signup",
  "signin",
  "register",
  "auth",
  "account",
  "password",
  "verify",
  "invite",
  "onboarding",
  // app surfaces
  "create",
  "new",
  "family",
  "dashboard",
  "settings",
  "admin",
  "design",
  "billing",
  "notifications",
  "reports",
  "search",
  "explore",
  "me",
  // platform / infra
  "api",
  "status",
  "security",
  "health",
  "assets",
  "static",
  "public",
  "cdn",
  "manifest",
  "robots",
  "sitemap",
  "favicon",
  "_next",
  "__nextjs",
  "vercel",
  "well-known",
  // QR / share resolver namespace
  "qr",
  "q",
  "s",
  "go",
  "r",
  // abuse-prone
  "root",
  "null",
  "undefined",
  "evermora",
  "official",
  "team",
]);

export function isReservedRoute(segment: string): boolean {
  return RESERVED_ROUTES.has(segment.toLowerCase());
}
