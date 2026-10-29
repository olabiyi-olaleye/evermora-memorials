# Transaction boundaries & idempotency

## Transactions

- **One operation = one transaction.** The primary write, the `audit_logs` row,
  and any `notifications` rows commit or roll back together.
- The transaction is opened by the domain via the repository / unit-of-work
  seam (`UnitOfWork.transaction(work)` — see [repositories.md](./repositories.md))
  and runs against a **server-only, full-privilege** connection (Drizzle /
  `postgres-js`) — RLS is not the enforcement layer here, the domain's own
  authorization is, and RLS still backstops any path that uses supabase-js.
- **Domain events are dispatched only after commit.** `DomainEventBuffer`
  collects them during the operation; the transport drains + dispatches once the
  transaction succeeds. An event must never announce a write that rolled back.
- Keep transactions short: authorize and validate **before** `BEGIN` where
  possible; do no network I/O (email, storage signing) inside the transaction.
- Multi-row writes that must be consistent (slug change = insert new canonical +
  retire old; ownership transfer = demote old owner + promote new) happen in one
  transaction. The DB guards (`memorial_slugs_one_canonical`,
  `memorial_memberships_one_active_owner`, the owner-protection trigger) make a
  partial write impossible.

## Idempotency

| Operation                                          | Idempotency expectation                                                                                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createMemorial`                                   | not idempotent — each call is a new memorial. A client retry-safety token (dedupe key) is **recommended** for the creation wizard.                                                             |
| `publishMemorial`                                  | idempotent-ish: publishing an already-`published` memorial is a `ConflictError`, not a second publish. Re-running after a transient failure is safe (state already advanced or advances once). |
| `archiveMemorial`, `cancelFuneralEvent`            | same pattern — terminal transition, second call conflicts.                                                                                                                                     |
| `approveTribute` / `rejectTribute` / `hideTribute` | second call on an already-moderated tribute conflicts; no double audit/notification.                                                                                                           |
| `changeMemorialSlug`                               | changing to the **current** canonical slug is a no-op `ConflictError`; changing to a slug the memorial already owns as an alias just re-promotes it.                                           |
| `transferMemorialOwnership`                        | transferring to the **current** owner is a no-op conflict.                                                                                                                                     |
| `inviteMemorialAdmin`                              | re-inviting the same email/profile updates the pending invite rather than creating a duplicate (`memorial_memberships_unique_invite`).                                                         |
| `requestFuneralService`, `reportMemorial`          | anonymous; a dedupe key (session + target + short window) prevents accidental double submit. Rate limiting also applies.                                                                       |
| `recordAuditEvent`                                 | append-only by nature; callers pass a stable `action` + `entity_id`; exact-duplicate suppression is best-effort.                                                                               |

## Retries & failure

- A caller (or transport) may safely retry an operation that failed **before
  commit** — nothing persisted.
- After commit, a retry hits the conflict/idempotency rules above and does not
  double-write.
- Post-commit side effects that fail (a notification send) are the notification
  service's problem (its own retry / dead-letter), never a reason to roll back
  the committed operation.

## Background work (DEFERRED)

`anniversary_upcoming` notifications and media processing run as scheduled /
queued jobs, outside a request transaction, and must themselves be idempotent
(safe to run twice for the same date / media id).
