# Analytics event architecture

A **product** analytics model — understand whether families succeed and where
they get stuck — without invasive visitor tracking.

Status: **DEFERRED** — no analytics provider, no event emission, no
`analytics_events` table. The event names below are the approved vocabulary;
they will also live in `@evermora/types` (alongside `DOMAIN_EVENTS`) when
implemented.

## Privacy principles (LOCKED intent)

- **No per-visitor identity tracking.** No cross-site cookies, no fingerprinting,
  no ad-tech. A memorial visitor is anonymous and stays anonymous.
- Aggregate and coarse: "this memorial had ~120 visitors this week", not "person
  X viewed it 4 times".
- `feature_settings.visitor_analytics_enabled` (per memorial, default on) gates
  whatever visitor-side counting exists; families can turn it off.
- Prefer **first-party, server-side** counting (a request hitting the memorial
  route) over any client SDK. If a provider is used, it must be
  privacy-respecting and cookieless.
- Analytics events are **distinct** from `audit_logs` (accountability) and
  `notifications` (delivery) — different purpose, different retention.

## Family success funnel

| Event                       | Emitted when                                      | Notes                  |
| --------------------------- | ------------------------------------------------- | ---------------------- |
| `MEMORIAL_STARTED`          | a `memorials` row is created (draft)              | funnel entry           |
| `MEMORIAL_PUBLISHED`        | `publishMemorial` succeeds                        | key activation         |
| `MEMORIAL_SHARED`           | family copies a share link / generates a QR asset |                        |
| `FIRST_VISITOR`             | first anonymous view of the published memorial    |                        |
| `TRIBUTE_SUBMITTED`         | visitor submits a tribute                         | volume signal          |
| `TRIBUTE_APPROVED`          | moderator approves                                | moderation throughput  |
| `FUNERAL_EVENT_VIEWED`      | a published funeral event is viewed               | pre-service usefulness |
| `QR_OPENED`                 | `resolve_share_token` hit from a QR scan          | print-artifact usage   |
| `SERVICE_REQUEST_SUBMITTED` | `requestFuneralService` succeeds                  | services demand        |

## Additional signals (candidate)

`STORY_SECTION_ADDED`, `PHOTO_UPLOADED`, `FAMILY_UPDATE_PUBLISHED`,
`INVITE_SENT` / `INVITE_ACCEPTED`, `REMEMBRANCE_LEFT`, `MEMORIAL_ARCHIVED`.

## Shape (when implemented)

```
{ name, occurred_at, memorial_id?, actor_kind (family|visitor|staff|system),
  properties (small, non-PII), source (web|family|admin) }
```

- Never store an IP, email, precise geo, or free-text that could identify a
  visitor.
- Server-emitted where possible; a thin, non-blocking client beacon only for
  genuinely client-only events (e.g. `QR_OPENED` landing).

## Choosing a provider (DEFERRED)

Criteria: cookieless / GDPR-friendly, EU hosting option, self-host vs SaaS,
cost, ability to feed a family-facing "your memorial this week" summary. The
family-facing summary may be built directly on first-party counts without any
third party.
