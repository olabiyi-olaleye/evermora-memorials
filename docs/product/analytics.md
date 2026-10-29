# Product analytics

**Purpose** understand whether families succeed and where they get stuck —
**without** invasive visitor tracking.

Status: **DEFERRED** — no provider, no event emission, no `analytics_events`
table. The architecture detail and event shape are in
[../architecture/analytics-events.md](../architecture/analytics-events.md); this
is the product view.

## Principles (LOCKED intent)

- **No per-visitor identity tracking.** No cross-site cookies, no fingerprinting,
  no ad-tech, no session recording. A mourner is anonymous and stays anonymous.
- **Aggregate and coarse.** "~120 visitors this week", never "person X viewed it
  4 times".
- **Family opt-out.** `feature_settings.visitor_analytics_enabled` (per memorial,
  default on) gates any visitor-side counting.
- **First-party first.** Prefer server-side counting (a request hitting the
  route) over a client SDK. Any provider must be cookieless.
- **Separate from audit & notifications.** Different purpose, different
  retention.

## Family success funnel

| Event                                    | When                               | What it tells us                   |
| ---------------------------------------- | ---------------------------------- | ---------------------------------- |
| `MEMORIAL_STARTED`                       | wizard step 1 committed            | top of funnel                      |
| `MEMORIAL_PUBLISHED`                     | `publishMemorial`                  | activation                         |
| `MEMORIAL_SHARED`                        | link copied / QR asset generated   | families are actually distributing |
| `FIRST_VISITOR`                          | first public view                  | the memorial reached someone       |
| `TRIBUTE_SUBMITTED` / `TRIBUTE_APPROVED` | visitor submit / moderator approve | engagement + moderation throughput |
| `FUNERAL_EVENT_VIEWED`                   | published event viewed             | pre-service usefulness             |
| `QR_OPENED`                              | `/q/{token}` hit                   | print-artifact usage               |
| `SERVICE_REQUEST_SUBMITTED`              | `requestFuneralService`            | services demand                    |

Candidate secondary: `STORY_SECTION_ADDED`, `PHOTO_UPLOADED`,
`FAMILY_UPDATE_PUBLISHED`, `INVITE_SENT` / `INVITE_ACCEPTED`, `REMEMBRANCE_LEFT`,
`MEMORIAL_ARCHIVED`.

## Family-facing summary (candidate feature)

A gentle "your memorial this week" panel in the portal — visitor count, new
tributes, upcoming anniversary — built **directly on first-party counts**, no
third party required. Never shown to visitors; never a public counter.

## Event shape (when built)

```
{ name, occurred_at, memorial_id?, actor_kind (family|visitor|staff|system),
  properties (small, non-PII), source (web|family|admin) }
```

Never store an IP, email, precise location, or identifying free text.

## Choosing a provider

Cookieless / GDPR-friendly, EU hosting, self-host vs SaaS, cost, ability to feed
the family summary. Decision recorded in
[../architecture/analytics-events.md](../architecture/analytics-events.md) when
analytics is built.
