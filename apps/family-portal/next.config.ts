import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

/**
 * Static security headers (Phase 5O). No nonce-based CSP — that requires
 * dynamic rendering on every route (see
 * `docs/architecture/security-architecture.md`). `'unsafe-inline'` is
 * required on script-src/style-src without a nonce; everything else is
 * locked down. `connect-src`/`img-src` allow the Supabase project directly —
 * the browser Supabase client (session refresh, auth) and signed Storage
 * URLs both call it from the client, not through a Server Action.
 */
function securityHeaders() {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const connect = ["'self'", supabaseUrl].filter(Boolean).join(" ");
  const img = ["'self'", "blob:", "data:", supabaseUrl].filter(Boolean).join(" ");

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img}`,
    "font-src 'self'",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@evermora/config",
    "@evermora/database",
    "@evermora/domain",
    "@evermora/types",
    "@evermora/ui",
    "@evermora/utils",
  ],
  experimental: {
    // Photo uploads flow through a Server Action; the domain still caps
    // individual images at 15 MB and validates magic bytes server-side.
    serverActions: { bodySizeLimit: "18mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

// PWA service worker (Phase 5P). Disabled in development — a service worker
// mid-development is a source of confusing stale-content bugs.
const withSerwist = withSerwistInit({
  swSrc: "sw.ts",
  swDest: "public/sw.js",
  // `/offline` is static (no dynamic data) — a manually-bumped revision is
  // enough for Serwist's precache cache-busting; bump it if the page's
  // content changes.
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
