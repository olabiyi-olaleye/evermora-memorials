# Flow — Platform admin

**Status — IMPLEMENTED** (Phase 5M) for the core moderation surface: sign-in +
non-staff refusal, an overview with counts, memorial search + suspend/restore,
the reports queue (review / action / dismiss with a note), and service-request
triage (status / assign / internal notes). **Deferred:** a user-detail screen,
a dedicated audit-log browser, MFA, and suspend/restore notifications (5N).

**Actor** Evermora platform staff (`profiles.is_platform_admin`), on the
isolated `admin.evermora.com` surface.
**Goal** keep the platform safe — handle abuse/privacy reports, manage service
requests, suspend content that violates policy — **without** editing families'
content.

## Preconditions

- Staff account with `is_platform_admin = true` (granted only by an existing
  admin / `service_role`, trigger-guarded).
- Separate sign-in (MFA planned).

## Report handling

| #   | Screen            | Action                                                                                     | System                                                                                                                                                                                                                                                                       |
| --- | ----------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Ops dashboard `/` | see open reports (by reason, oldest first)                                                 | reads `reports` where `status='open'`                                                                                                                                                                                                                                        |
| 2   | `/reports/{id}`   | review: reported memorial/tribute, reason, reporter contact (staff view), memorial context | staff can read the base tables + private columns                                                                                                                                                                                                                             |
| 3   | Report detail     | **Hide tribute** (if a tribute)                                                            | [`hideTribute`](../../domain/operations/hide-tribute.md) — works on **any** memorial for staff (`or app.is_platform_admin()` in the policy); audit `actor_kind = platform_admin`                                                                                             |
| 4   | Report detail     | **Suspend memorial** (impersonation, serious abuse)                                        | `update memorials set status='suspended', suspended_reason=…` — permitted **only** for platform admin by the `memorials_guard_lifecycle` trigger; `can_read_memorial` immediately hides it from the public; the family sees a "suspended by Evermora" banner and cannot edit |
| 5   | Report detail     | **Resolve** (with a resolution note) or **Dismiss**                                        | `resolveReport` → `reports.status` becomes `actioned` or `dismissed`; sets `resolved_by`, `resolved_at`                                                                                                                                                                      |
| 6   | Report detail     | **Unsuspend** later (appeal upheld)                                                        | `status` back to `published`/`archived`; audited                                                                                                                                                                                                                             |

## Service requests

See [service-request.md](./service-request.md) steps 5–6 — triage, assign,
status, internal notes, contact the requester.

## Investigation

| Screen            | Use                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `/users/{id}`     | a person's memberships, memorials they own, recent audit activity                                     |
| `/memorials/{id}` | full metadata, membership list, slug history, content summary, audit trail, suspend control           |
| `/audit`          | platform-wide `audit_logs`, filter by memorial / actor / action / date — the timeline of who did what |

## Events

audit for every staff action (`actor_kind = platform_admin`): `tribute.hidden`,
`memorial.status_changed` (suspend/unsuspend, also via trigger), report
resolution.

## Edge cases

- **Staff must never silently edit family content** — no `memorial.edit` /
  `story.edit` capability; intervention is _hide_ (tribute) or _suspend_
  (memorial), each visible and audited.
- **A family disputes a suspension** — handled off-platform (support); unsuspend
  is a deliberate, audited action.
- **Reporter is anonymous** — `reporter_email` (if given) is platform-internal;
  no way to reply in-app in MVP.
- **Bulk abuse (a spam wave)** — rate limiting + the report queue; a future
  tooling upgrade ([future-scope.md](../future-scope.md)).
- **A staff account is compromised** — `is_platform_admin` can be revoked by
  another admin; all staff actions are audited; MFA (planned) reduces the risk.

## Principles touched

Platform authority is explicit and audited, **not** a superset of family
permissions · privacy (reporter/requester contact stays internal) · security
isolation (separate app, separate session).
