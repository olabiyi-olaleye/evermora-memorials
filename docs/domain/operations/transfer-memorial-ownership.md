# transferMemorialOwnership

**Status — IMPLEMENTED** (Phase 5K). Executable, unit- and integration-tested.

**Purpose** — Move the single `owner` role from one family member to another.

**As built** — the `memberships_guard_owner` trigger blocks demoting the last
active owner and the `memorial_memberships_one_active_owner` partial unique index
blocks two at once, so the swap runs through the SECURITY DEFINER
`transfer_memorial_ownership(target_memorial, new_owner)` RPC: it re-checks the
caller is the current owner (`memorial.delete` proxy) or platform admin, sets a
transaction-local `app.owner_transfer` flag the guard honours, then
demotes-then-promotes in one transaction. The previous owner becomes `admin`.
Domain event + audit `memorial.ownership_transferred` (plus the pre-existing
`memberships_audit_owner_change` trigger).

**Business responsibility** — Guarantee a memorial always has **exactly one
active owner**, and that ownership only moves through this deliberate,
audited operation.

## Caller context / Input / Output

|        |                                                                          |
| ------ | ------------------------------------------------------------------------ |
| Caller | authenticated; the **current owner** of the memorial (or platform admin) |
| Input  | `memorialId`, `newOwnerProfileId` (must be an existing active member)    |
| Output | `{ memorialId, previousOwnerProfileId, newOwnerProfileId }`              |

## Authentication / Authorization

- `Unauthenticated` / `NotFound`.
- `ForbiddenError` unless the caller is the current active `owner`
  (`has_memorial_permission(id,'memorial.delete')` is the owner-only proxy) or a
  platform admin.
- `newOwnerProfileId` must already be an `active` member — else
  `precondition_failed` ("invite them first").

## Validation / Invariants / Preconditions

- `newOwnerProfileId` ≠ current owner → else `ConflictError` (no-op).
- Before: 1 active owner. After: still exactly 1 active owner
  (`memorial_memberships_one_active_owner` partial unique index).
- The previous owner is **demoted to `admin`** (not removed) unless the caller
  specifies otherwise; they never silently lose access.
- Re-authentication is recommended for this action
  ([security-architecture.md](../../architecture/security-architecture.md)).

## Database interactions / Transaction

One transaction, ordered so the unique index never sees two owners:

1. demote current owner: `update memorial_memberships set role='admin' where memorial_id=? and role='owner' and status='active'`
2. promote new owner: `update memorial_memberships set role='owner' where memorial_id=? and profile_id=?`
   — the `memberships_guard_owner` trigger allows this (there is a replacement);
   `memberships_audit_owner_change` writes `memorial.ownership_transferred`.
3. operation audit row.

## Side effects / Events

- **Domain event** `memorial.ownership_transferred`
  `{ memorialId, from, to }`.
- **Audit** `memorial.ownership_transferred` (+ trigger).
- **Notification** to the new owner ("you are now the owner of …").

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `Conflict` (same person) ·
`precondition_failed` (target not a member) · `internal`.

## Idempotency

Transferring to the current owner → `ConflictError`. The last-owner guard makes
a half-applied transfer impossible.

## Security considerations

Only the current owner or platform admin can initiate. RLS forbids creating an
`owner` membership through the normal membership path
(`memberships_insert_admins` `WITH CHECK role <> 'owner'`), so this operation is
the **only** way ownership moves.

## Related

Entities: `memorial_memberships`, `audit_logs`. Flow:
[family access / invitation](../../product/flows/family-access-invitation.md).
