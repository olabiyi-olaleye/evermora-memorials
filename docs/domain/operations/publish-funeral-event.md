# publishFuneralEvent · completeFuneralEvent

**Status — IMPLEMENTED** (Phase 5H). Executable, unit- and integration-tested.
`cancelFuneralEvent` shares the same lifecycle machine — see
[cancel-funeral-event.md](./cancel-funeral-event.md).

**Purpose** — Move one funeral event through its lifecycle. Funeral status is
independent of the memorial's own lifecycle.

- **publish**: `draft | cancelled → published` (needs a date; sets `published_at`)
- **complete**: `published → completed`

**Business responsibility** — A published event with a date and place is what
visitors rely on to attend; publishing is deliberate. A cancelled event can be
re-published (plans change back).

## Caller context / Input / Output

|        |                                                   |
| ------ | ------------------------------------------------- |
| Caller | authenticated; `funeral.manage` or platform admin |
| Input  | `{ memorialId, eventId, reason? }`                |
| Output | `{ eventId, status }`                             |

## Authentication / Authorization

`UnauthenticatedError`; then `requireMemorialPermission(memorialId, 'funeral.manage')`
— `MemorialNotFoundError` / `ForbiddenError` / `MemorialInvalidStateError` as for
[saveFuneralEvent](./save-funeral-event.md). The event must belong to
`memorialId` or `NotFoundError`.

## Validation / Invariants / Preconditions

- **Already in the target status** → no-op, returns the current status.
- **Source status not allowed** for the move → `ConflictError { reason: "invalid_transition", from }`.
  - publish accepts `draft`, `cancelled`
  - complete accepts `published`
- **publish** additionally requires `eventDate` →
  `PreconditionFailedError { reason: "missing_date" }`.
- publish sets `published_at` (keeps an existing timestamp when re-publishing a
  cancelled event), satisfying `funeral_events_published_has_timestamp`.

## Database interactions / Transaction

One transaction: `update funeral_events` (status + lifecycle timestamps) + one
`audit_logs` row. Action `funeral_event.<target>` (`published` / `completed`).

## Side effects / Events

- **Domain event** `funeral_event.published` on publish; none for complete.
- **Audit** `funeral_event.published` / `funeral_event.completed`.
- **Notification** publish fires `funeral_event_published` (in-app) to every
  other active memorial member, via `notifyMemorialMembers` (Phase 5N). None
  for complete.

## Errors

`unauthenticated` · `forbidden` · `not_found` · `conflict` · `precondition_failed`
· `internal`.

## Idempotency

Re-running a move that is already satisfied returns the current status without a
second audit row or event.

## Security considerations

Publishing exposes the event card (address, coordinates, livestream URL) subject
to memorial + section + event visibility — see
[saveFuneralEvent](./save-funeral-event.md#security-considerations).

## Related

Entities: `funeral_events`, `memorials`. Flow:
[funeral management](../../product/flows/funeral-management.md).
