# saveFuneralEvent

**Status — IMPLEMENTED** (Phase 5H). Executable, unit- and integration-tested.

**Purpose** — Create (no `id`) or update (`id`) one funeral-related event
(service of songs, wake, viewing, funeral service, burial, reception,
thanksgiving, custom) on a memorial. A new event starts as `draft`.

**Business responsibility** — Funeral information is **multiple structured
records**, never one JSON blob. Privacy is **event-level** (§39): the whole
event card is shown or hidden per its `visibility`; there is no field-level
hiding. Editing events never touches `memorials.status`.

## Caller context / Input / Output

|        |                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated; `funeral.manage` (owner / admin / content_editor) or platform admin                                                                                                                                                                                                                                                                                                                                                                                        |
| Input  | `memorialId`, `id?`, `eventType` (default `custom`), `title` (1–200), `description?`, `eventDate?` (`YYYY-MM-DD`), `startTime?`/`endTime?` (`HH:MM`), `timezone?`, `venueName?`, `addressLine?`, `city?`, `region?`, `country?`, `postalCode?`, `latitude?`/`longitude?`, `dressCode?`, `contacts?` (≤ 5 × `{ name, phone? }`; replaces the whole list), `livestreamUrl?` (http(s) URL or `""`), `instructions?`, `visibility?` (`section_visibility`, default `inherit`) |
| Output | `{ event: FuneralEventRow, created: boolean }`                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Authentication / Authorization

`UnauthenticatedError` if not signed in. `requireMemorialPermission` loads the
memorial through RLS and throws `MemorialNotFoundError` (a non-member cannot see
a draft memorial), `ForbiddenError` without `funeral.manage`,
`MemorialInvalidStateError` when the memorial is `suspended` or `archived`.

## Validation / Invariants / Preconditions

- `title` trimmed, non-empty, ≤ 200.
- `endTime >= startTime` when both are set → otherwise
  `ValidationError { reason: "time_order" }` (mirrors `funeral_events_time_order`).
- `latitude ∈ [-90, 90]`, `longitude ∈ [-180, 180]`.
- `contacts`: at most `MAX_FUNERAL_EVENT_CONTACTS` (5); each `name` trimmed and
  non-empty (≤ 200), `phone` trimmed (≤ 60, empty → null). The DB enforces the
  cap too (`funeral_events_contacts_shape`).
- `livestreamUrl` must be an `http://`/`https://` URL or empty (Phase 5O —
  `isSafeHttpUrl` in `@evermora/utils`, rejects `javascript:`/`data:`/
  `vbscript:`/`file:` and anything else); an empty value is stored as null.
  It's rendered as a plain `<a href>` on the public memorial with
  `rel="noopener noreferrer"`, so an unsafe scheme here would otherwise be a
  stored-XSS vector reachable by anyone with `funeral.manage`.
- Optional text fields are trimmed; empty becomes null.
- Create: `status = 'draft'`, `published_at` null, `displayOrder = max(siblings)+1`.
- The `funeral_enabled` feature flag is **not** enforced here — the public page
  is what respects it. RLS `funeral_events_write` backstops the write.

## Database interactions / Transaction

One transaction-scoped-RLS unit of work: `insert`/`update` on `funeral_events`
(without `RETURNING` — the row is read back) plus one `audit_logs` row.

## Side effects / Events

- **Domain event** `funeral_event.created` `{ memorialId, funeralEventId }` — on
  create only.
- **Audit** `funeral_event.created` / `funeral_event.updated`.
- **Notification** none on save — `publishFuneralEvent` / `cancelFuneralEvent`
  (below) each fire one.

## Errors

`unauthenticated` · `forbidden` · `not_found` · `validation` · `precondition_failed`
(suspended / archived memorial) · `internal`.

## Idempotency

Not idempotent on create. Update is naturally idempotent for identical input.

## Security considerations

Venue address, coordinates and livestream URL only reach visitors once the event
is **published** and both the memorial and the `funeral_events` section privacy
allow it, and only when the event's own `visibility` is `inherit` or `public`
(migration `20260902184742_funeral_event_visibility`). `instructions` /
`description` / `cancelReason` are plain text.

## Related operations

### removeFuneralEvent

`funeral.manage`. Soft-deletes one event (`deleted_at`). Audit
`funeral_event.removed`. Input `{ memorialId, eventId }` → `{ removed: true }`.

### setFuneralPlanningStatus

`funeral.manage`. Sets `memorials.funeral_planning_status` (`not_started` →
`planning` → `partially_confirmed` → `confirmed` → `completed`). A no-op when
unchanged. Audit `memorial.funeral_planning_changed`. **Independent of
`memorials.status`** — a memorial can be published while planning is
`not_started`, and vice versa. Input `{ memorialId, status }` →
`{ funeralPlanningStatus }`.

## Related

Entities: `funeral_events`, `feature_settings`, `privacy_settings`, `memorials`.
Flow: [funeral management](../../product/flows/funeral-management.md).
