# Future product scope

Post-MVP product areas. Listed so the roadmap is visible and the MVP boundary is
explicit — **none are designed or scheduled**. The MVP boundary itself is
[mvp-scope.md](./mvp-scope.md).

## Commerce & services

| Area                                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Billing / subscriptions / plans**  | `PAYMENT_PROVIDER_SECRET` is a placeholder; no pricing model; commerce tables (`subscriptions`, `products`, `plans`, `orders`, `order_items`, `payments`, `refunds`, `quotes`, `invoices`) are **future-ready in the long-term model but not implemented** (Phase 2 brief §4). Likely shape: a free memorial + optional paid tiers (extra storage, premium themes, longer retention guarantees) — decided later. `billing.manage` permission is already reserved for `owner`. |
| **Service marketplace / fulfilment** | MVP only captures & routes `service_requests`. A real marketplace (vendors, quotes, scheduling, payments) is a large separate product.                                                                                                                                                                                                                                                                                                                                        |
| **Funeral-home / partner portal**    | partners managing multiple families' memorials — needs its own auth surface and data model.                                                                                                                                                                                                                                                                                                                                                                                   |

## Delivery & infrastructure

| Area                                                     | Notes                                                                                                                                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email / SMS / push delivery**                          | provider not selected; `notifications` event model + adapter seam exist ([../architecture/notification-architecture.md](../architecture/notification-architecture.md)). |
| **Image transformation / CDN**                           | Supabase Storage holds originals; the optimizer is deferred with documented criteria ([../architecture/media-storage.md](../architecture/media-storage.md)).            |
| **PWA implementation**                                   | scope locked (web + family); Serwist pending Next.js-version verification.                                                                                              |
| **Staging / production environments**                    | free-tier project limits; dev-only for now.                                                                                                                             |
| **Custom domains** (`evermora.com`, `family.`, `admin.`) | not configured.                                                                                                                                                         |
| **Analytics provider**                                   | privacy-first model documented; nothing wired.                                                                                                                          |
| **Background jobs**                                      | `anniversary_upcoming` reminders, media processing, funeral-event auto-`completed` — need a scheduler (Vercel Cron / Supabase).                                         |

## Product depth

| Area                                    | Notes                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Guestbook**                           | `guestbook_enabled` toggle reserved; a lighter-weight surface distinct from tributes (short signatures vs longer messages) — not designed. |
| **Livestream hosting**                  | MVP stores a `livestream_url`; hosting/embedding a stream is external.                                                                     |
| **Themes / visual customisation**       | one considered editorial treatment for MVP; family-selectable themes later (candidate paid feature).                                       |
| **Rich story authoring**                | timelines, maps of places lived, audio memories — beyond the MVP text sections.                                                            |
| **Contributor photos at scale**         | approval queue, bulk tools, face-blur, EXIF-GPS stripping (basic stripping is a security requirement even in MVP).                         |
| **i18n / multi-language memorials**     | English only for v1; the schema doesn't preclude it.                                                                                       |
| **Anniversary & memory prompts**        | gentle, opt-in, never a re-engagement dark pattern.                                                                                        |
| **Data export / "download everything"** | a family's right to take their memorial with them — high priority for trust, post-MVP.                                                     |
| **Accessibility beyond AA**             | the public memorial should aim higher over time.                                                                                           |

## Platform & trust

| Area                         | Notes                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Advanced abuse tooling**   | ML spam scoring, coordinated-abuse detection, device signals — MVP has reports + rate limiting + manual review. |
| **Platform-admin MFA**       | strongly recommended before real admin data; currently planned, not built.                                      |
| **Appeals workflow**         | structured suspension appeals; MVP handles via support.                                                         |
| **Audit retention & export** | policy + tamper-evidence for `audit_logs`.                                                                      |
| **Backups / DR runbook**     | documented restore drill on the chosen Supabase plan.                                                           |

## Explicitly not planned (ever, per principles)

Social feed · followers · reactions / likes · comments on tributes · public view
counters · discovery/recommendation algorithm · advertising · selling or
brokering user data.
