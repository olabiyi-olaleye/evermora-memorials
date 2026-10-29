# listMyNotifications · markNotificationsRead

**Status — IMPLEMENTED** (Phase 5N): `packages/domain/src/operations/notifications.ts`,
unit + integration tested. The recording side — `notifyMemorialMembers`,
`notifyPlatformStaff`, `notifyByEmail` (`packages/domain/src/operations/notify.ts`)
— is not itself a caller-facing operation; it's an in-transaction helper 6
other operations call. See
[events.md](../events.md#event--audit--notification-map) for the full map and
[notification-architecture.md](../../architecture/notification-architecture.md)
for the end-to-end flow, including what's still deferred (the email delivery
worker and its provider).

**Purpose** — The in-app notification centre: a recipient reads their own
`notifications` rows and marks them read.

## Caller context / Input / Output

|                             |                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Caller                      | authenticated (any signed-in user; RLS scopes results to their own rows)           |
| `listMyNotifications` in    | `{ unreadOnly?, limit? (1–100, default 30) }`                                      |
| `listMyNotifications` out   | `{ notifications: NotificationRow[], unread: number }` — `channel = 'in_app'` only |
| `markNotificationsRead` in  | `{ ids?: string[] (≤200), all? }`                                                  |
| `markNotificationsRead` out | `{ ok: true }`                                                                     |

## Authentication / Authorization

`UnauthenticatedError` if not signed in. No further authorization — RLS
(`notifications_select_own` / `notifications_update_own`) is the only scoping;
the operation never accepts a `profileId` from input, always the caller's own
`caller.userId`.

## Behaviour

- `listMyNotifications` reads `channel = 'in_app'` rows for the caller, newest
  first, and the caller's unread count — both in one transaction.
- `markNotificationsRead` marks specific `ids` (owned by the caller — the
  `WHERE recipient_profile_id = caller.userId` guard means an id belonging to
  someone else is silently a no-op, not an error) or, with `all: true`, every
  unread row for the caller.
- `channel = 'email'` rows never appear here — they're for the (not yet built)
  delivery worker.

## Database interactions / Transaction

One transaction-scoped-RLS unit of work: `SELECT`/`UPDATE` on `notifications`
under the caller's own role — no elevation needed on this path (only writing a
notification, in `notify.ts`, needs the `service_role` escalation).

## Side effects / Events

None — a pure read/write-your-own-notifications operation. No audit row (would
be noisy for a routine "mark read" click) and no domain event.

## Errors

`unauthenticated` · `validation` (malformed input) · `internal`.

## Idempotency

Both are naturally idempotent — reading twice returns the same shape (modulo
new rows); marking an already-read row read again is a no-op.

## Recording side — `notify.ts` (not a caller-facing operation)

| Helper                  | Recipients                                                         | Elevation needed?                                                                                            |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `notifyMemorialMembers` | every other active member of one memorial (`memorialRecipientIds`) | yes — the actor (e.g. an anonymous tribute submitter) may have no RLS visibility into `memorial_memberships` |
| `notifyPlatformStaff`   | every platform-admin profile (`platformAdminIds`)                  | yes — a non-staff caller can't `SELECT` other `profiles`                                                     |
| `notifyByEmail`         | one email address (`recipient_email`, no `recipient_profile_id`)   | yes — inserting any `notifications` row needs it (`authenticated` has no `INSERT` grant on the table)        |

All three call `NotificationRepository.recordMany`, which does the actual
`service_role` escalation for the `INSERT` (same narrow, per-statement pattern
as `AuditRepository.record` — see
[repositories.md](../repositories.md#why-this-is-the-secure-design-the-rlsdrizzle-decision)).
Every call excludes the acting caller and happens **inside** the calling
operation's own transaction — a rollback rolls the notification back too.

## Related

Entities: `notifications`, `profiles`. Callers: `publishFamilyUpdate`,
`publishFuneralEvent`, `cancelFuneralEvent`, `submitTribute` (when not
auto-approved), `reportTribute`, `requestFuneralService`,
`inviteMemorialAdmin` (new invite). UI: the bell in `apps/family-portal`
(`src/components/notification-bell.tsx`) and `apps/platform-admin`
(same component name, routes staff events to `/reports` /
`/service-requests` instead of a memorial page).
