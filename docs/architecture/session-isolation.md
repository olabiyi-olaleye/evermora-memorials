# Session isolation

**LOCKED — MVP.** Authentication is isolated per application/subdomain. There is
**no shared `.evermora.com` auth cookie**.

```
evermora.com          →  anonymous visitor experience (no family session at all)
family.evermora.com   →  family authentication / session
admin.evermora.com    →  isolated platform-admin authentication / session
```

## Why

- **Security blast radius** — a problem in one surface's session handling cannot
  hand an attacker another surface.
- **The platform-admin session is especially isolated** — different auth
  expectations (MFA candidate), internal-only, kept on its own project/subdomain.
- **Public performance** — `evermora.com` never needs to read, refresh, or ship
  JS for a family session; public memorial pages stay lightweight
  ([performance-architecture.md](./performance-architecture.md)).
- **Simplicity** — avoids cross-subdomain cookie/CORS complexity for the MVP.

## Consequences

- **Draft preview lives in `family.evermora.com`**, not behind an authenticated
  route on `evermora.com` (see
  [authentication-architecture.md](./authentication-architecture.md)).
- A family member who is also platform staff signs in **separately** to
  `family.evermora.com` and `admin.evermora.com`.
- Supabase cookies are scoped to each app's own host; `@supabase/ssr` cookie
  options must not set a parent `.evermora.com` domain.
- Sharing/QR links always target the **public** memorial URL, never a portal URL.
- **The `apps/family-portal` service worker never caches a page, RSC payload,
  or API response** (`sw.ts` — all `NetworkOnly`), so a signed-out device
  cannot serve one family's content to whoever signs in next. Sign-out also
  posts `CLEAR_AUTH_CACHES` to the worker to empty even the static-asset
  caches ([pwa-architecture.md](./pwa-architecture.md)).

## Revisiting

A shared-session model (single sign-on across `family.` and `admin.`) is **not**
planned for the MVP. If ever reconsidered it requires: explicit threat modelling,
a parent-domain cookie strategy, and per-surface re-authentication for
sensitive actions — and platform-admin would still stay isolated.
