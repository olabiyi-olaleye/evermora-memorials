# MVP scope

What the first release does — and what is deliberately left out. The data
foundation for all of this exists ([../architecture/data-model.md](../architecture/data-model.md));
the UI and domain operations do not.

## In scope (MVP)

### Public memorial (`apps/web`)

- Memorial page at `evermora.com/{slug}`: portrait, name, dates, memorial
  message, life story sections, photo gallery, approved tributes, published
  funeral events, published family updates, remembrance actions (candle etc.).
- Slug resolution: canonical + historical alias 301s + respectful 404.
- QR / share-token landing that redirects to the current canonical URL.
- Server-rendered social preview (Open Graph) for WhatsApp/social.
- `noindex` unless the family enables search indexing.
- Anonymous contribution where enabled: submit a tribute, leave a remembrance,
  report a memorial/tribute, submit a service request.

### Family portal (`apps/family-portal`)

- Sign in / sign up / password reset; accept a memorial invitation.
- Create a memorial (guided wizard) → draft.
- Edit: identity/dates, memorial message, story sections, photo gallery/albums,
  related people (family section).
- Draft preview (inside the portal — no public draft URL).
- Publish / archive the memorial.
- Change the memorial slug (old links keep working).
- Privacy controls: memorial visibility, per-section visibility, search
  indexing toggle.
- Feature controls: the fixed toggle set (tributes, moderation, photo
  contributions, candles, funeral, family section, updates, sharing, QR,
  analytics).
- Tribute moderation queue: approve / reject / hide.
- Funeral events: create, edit, publish, cancel (multiple structured events).
- Family updates: write, publish (official notices).
- Access: invite helpers with a role, change roles, transfer ownership, remove
  access.
- Sharing: copy link, generate a QR/share asset.
- Service requests: submit and track (own requests, via a safe view).
- Notifications: in-app list (email delivery deferred).
- Account settings.

### Platform admin (`apps/platform-admin`)

- Isolated staff sign-in.
- Browse users, memorials, memberships.
- Moderation: review reports, hide tributes, **suspend / unsuspend** a memorial.
- Service request queue: triage, assign, update status, internal notes.
- Audit log viewing (platform-wide, and per memorial).
- Abuse / privacy investigation basics.

### Cross-cutting

- RLS-enforced authorization on every path; three-layer model.
- Append-only audit trail.
- Provider-agnostic notification **events** (delivery deferred).

## Out of scope (FUTURE — see [future-scope.md](./future-scope.md))

| Area                                                        | Why deferred                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Billing / subscriptions / payments**                      | tables not built; `PAYMENT_PROVIDER_SECRET` is a placeholder; no pricing decision |
| **Service marketplace / fulfilment**                        | MVP only _captures & routes_ service requests                                     |
| **Email / SMS / push delivery**                             | provider not selected; only the event model exists                                |
| **Image transformation / CDN pipeline**                     | provider not selected; Supabase Storage holds originals                           |
| **QR generation UI**                                        | resolver + data model exist; the design/print flow is later                       |
| **PWA (service worker, offline, install)**                  | scope locked (web + family), implementation later                                 |
| **Real-time** (live tribute stream, presence)               | not needed for MVP                                                                |
| **i18n / multi-language memorials**                         | English only for v1                                                               |
| **Guestbook** (distinct from tributes)                      | `guestbook_enabled` reserved; surface not designed                                |
| **Livestream hosting**                                      | MVP stores a `livestream_url`; hosting is external                                |
| **Analytics provider**                                      | privacy-first model documented; no third party wired                              |
| **Staging / production environments**                       | free-tier limits; dev only for now                                                |
| **Custom domains**                                          | not configured                                                                    |
| **Anniversary reminders**                                   | `anniversary_upcoming` event reserved; scheduler deferred                         |
| **Advanced abuse tooling** (ML spam, device fingerprinting) | basic reports + rate limiting first                                               |

## Explicitly not planned

Social feed, followers, reactions, comments on tributes, public view counters,
discovery/recommendation, ads, data resale.
