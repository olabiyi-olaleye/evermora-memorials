# cancelFuneralEvent

**Status — IMPLEMENTED** (Phase 5H). Shares the lifecycle machine with
[publishFuneralEvent / completeFuneralEvent](./publish-funeral-event.md).

**Purpose** — Mark a funeral event cancelled without deleting it.

**Business responsibility** — A cancelled event must be **unmistakably** shown as
cancelled (not deleted, not silently hidden) so no one travels to a service that
isn't happening. The row is kept for history and so a later notification makes
sense.

## Caller context / Input / Output

|        |                                                                        |
| ------ | ---------------------------------------------------------------------- |
| Caller | authenticated; `funeral.manage` or platform admin                      |
| Input  | `{ memorialId, eventId, reason? }` (`reason` ≤ 500, shown to visitors) |
| Output | `{ eventId, status: "cancelled" }`                                     |

## Validation / Invariants / Preconditions

- `draft | published → cancelled`. Already `cancelled` → no-op. From `completed`
  → `ConflictError { reason: "invalid_transition", from: "completed" }`.
- `cancelled_at` set; `cancel_reason` stored (nullable) and rendered on the
  public memorial for a cancelled event that had been published.
- A cancelled event can be re-published (`publishFuneralEvent`).

## Database interactions / Transaction

One transaction: `update funeral_events set status='cancelled',
cancelled_at=now(), cancel_reason=?` + audit `funeral_event.cancelled`.

## Side effects / Events

- **Domain event** `funeral_event.cancelled` `{ memorialId, funeralEventId }`.
- **Audit** `funeral_event.cancelled`.
- **Notification** `funeral_event_updated` (in-app) to every other active
  memorial member, via `notifyMemorialMembers` (Phase 5N).

## Errors

`unauthenticated` · `forbidden` · `not_found` · `conflict` · `internal`.

## Security considerations

`reason` is visitor-visible free text — rendered as plain text (no markup).

## Related

Entities: `funeral_events`. Flow:
[funeral management](../../product/flows/funeral-management.md).
