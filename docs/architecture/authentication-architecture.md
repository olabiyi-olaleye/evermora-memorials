# Authentication architecture

**Supabase Auth** is the identity provider (LOCKED). Authentication answers
_who is this?_ — never _what may they do?_ (that is
[authorization](./authorization-architecture.md)).

```
auth.users            ← Supabase Auth owns credentials, sessions, tokens
   │ 1:1 (trigger app.handle_new_user)
   ▼
public.profiles       ← Evermora application-level user (no credentials)
   │ 1:N
   ▼
memorial_memberships  ← role + status per memorial
   │ N:1
   ▼
memorials
```

## `profiles`

- PK **is** `auth.users.id` (`references auth.users(id) on delete cascade`).
- Created automatically by the `on_auth_user_created` trigger →
  `app.handle_new_user()` (SECURITY DEFINER), pulling `display_name` /
  `full_name` / `avatar_url` from `raw_user_meta_data`, falling back to the email
  local-part.
- Holds **no** password, token, or session data — those never leave
  `auth.users`.
- `is_platform_admin boolean` — platform-staff flag, trigger-guarded so only an
  existing platform admin (or `service_role`) can change it.
- `profiles.id === auth.uid()` — so `auth.uid()` is the profile id everywhere.

## Visitors need no account (LOCKED)

Viewing a memorial, reading published tributes, viewing funeral information, and
submitting a tribute / remembrance / report where enabled all work
**anonymously** via the Supabase `anon` role. Anonymous writes are constrained by
RLS `WITH CHECK` (see [rls-architecture.md](./rls-architecture.md)).

## Session isolation (LOCKED — MVP)

No shared `.evermora.com` auth cookie. Each surface holds its own session:

| Surface                                      | Session                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `evermora.com` (`apps/web`)                  | anonymous — **no** family session on public pages |
| `family.evermora.com` (`apps/family-portal`) | family authentication                             |
| `admin.evermora.com` (`apps/platform-admin`) | isolated platform-admin authentication            |

Details and rationale: [session-isolation.md](./session-isolation.md).

## Draft preview (LOCKED — MVP)

There is **no** authenticated draft preview on `evermora.com/{slug}`. Families
preview drafts **inside** `family.evermora.com`, rendering a near-identical
memorial presentation within the authenticated environment. The public address
becomes live only on publish.

## Client wiring (`@evermora/database`)

| Factory                                                  | Context                                      | Auth                                            | RLS                       |
| -------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- | ------------------------- |
| `createSupabaseBrowserClient({url, anonKey})`            | client components                            | user session from cookies (via `@supabase/ssr`) | done                      |
| `createSupabaseServerClient({url, anonKey, cookies})`    | Server Components / Actions / Route Handlers | user session via the passed cookie adapter      | done                      |
| `createSupabaseServiceRoleClient({url, serviceRoleKey})` | trusted server code only                     | none (no session)                               | no bypasses RLS by design |

The cookie adapter is a framework-agnostic interface (`getAll` / `setAll`) so
`@evermora/database` never imports `next/*`; apps back it with `next/headers`
`cookies()`. The Next `proxy` (formerly `middleware`) file refreshes the session
on navigation (`apps/family-portal/src/proxy.ts` → `lib/supabase/proxy.ts`).

## Family portal wiring (Phase 5B — IMPLEMENTED)

`apps/family-portal` is the first surface with a real session:

- **Transport layer only.** `lib/supabase/{server,client,proxy}.ts` build the
  request-scoped clients; `lib/auth.ts` (`getAuthUser` / `requireAuthUser`)
  reads `supabase.auth.getUser()` + the `profiles` row and, for protected
  routes, redirects to `/sign-in?next=…`. `lib/caller.ts` maps an `AuthUser`
  to the domain `CallerContext` and sanitises the `next` param.
- **Server Actions call the domain, never SQL.** `lib/actions/*` authenticate
  the server session, build the `CallerContext`, then invoke an
  `@evermora/domain` operation through `lib/domain.ts` (`runOperation` →
  `ActionResult`). Postgres / stack details never reach the client — non-domain
  errors are logged server-side and returned as a generic `internal` error.
- **Reads go through RLS.** `lib/data/*` use the cookie-bound Supabase client,
  so the signed-in user only ever sees rows RLS permits.
- **Routes:** `(auth)/` — sign-in, sign-up, forgot / reset password;
  `(app)/` — dashboard, `memorials/new`, `memorials/[id]` (publish).
- **Password reset never discloses whether an account exists.**

## Local sign-in requires normalised token columns

GoTrue scans `auth.users` token columns (`confirmation_token`,
`recovery_token`, `email_change*`, `phone_change*`, `reauthentication_token`)
into non-nullable Go strings. A hand-written `INSERT` that leaves them `NULL`
makes every login fail with `converting NULL to string is unsupported`.
`supabase/seed.sql` normalises them to `''` after inserting the seeded users.

## Local configuration (`supabase/config.toml`)

- `site_url` → `http://127.0.0.1:3001` (family portal); redirect allow-list adds
  `:3002` (admin) and `localhost` variants.
- Email signup on; email confirmations off locally; refresh-token rotation on
  (`refresh_token_reuse_interval = 10s`); `minimum_password_length` 6 locally.
- Local emails are captured by Inbucket (`http://127.0.0.1:54424`), not sent.
- MFA / external OAuth providers: not configured (DEFERRED).

## Deferred

- Invite acceptance UI — family-access phase. Sign-in / sign-up / password
  reset are implemented in the family portal (Phase 5B).
- Production SMTP provider (tied to the [notification
  provider](./notification-architecture.md) decision).
- MFA for platform admin (recommended before real admin data — see
  [security-architecture.md](./security-architecture.md)).
