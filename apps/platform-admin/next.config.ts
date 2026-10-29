import type { NextConfig } from "next";

/**
 * Static security headers (Phase 5O). No nonce-based CSP — that requires
 * dynamic rendering on every route (see
 * `docs/architecture/security-architecture.md`). `'unsafe-inline'` is
 * required on script-src/style-src without a nonce; everything else is
 * locked down. `connect-src`/`img-src` allow the Supabase project directly —
 * the browser Supabase client (session refresh, auth) calls it from the
 * client, not through a Server Action.
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
