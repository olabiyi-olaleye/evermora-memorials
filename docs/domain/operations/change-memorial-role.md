# changeMemorialRole

**Status — IMPLEMENTED** (Phase 5K). Executable, unit- and integration-tested.

**Purpose** — Change an existing member's role on a memorial, suspend / restore /
revoke their access, or cancel a pending invitation (`status = 'revoked'`).

**As built** — `admins.manage`. Rejects changing the `owner` (use
`transferMemorialOwnership`) and a caller changing **their own** access. The DB
`memberships_guard_owner` trigger (last-owner / self-role) is the backstop; if it
fires, the operation maps `insufficient_privilege` → `precondition_failed`
`{ reason: "ownership_guard" }`. Domain event `memorial_role.changed`.

**Business responsibility** — Keep team permissions correct over the life of a
memorial without ever creating a second owner or letting someone escalate
themselves.

## Caller context / Input / Output

|        |                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated; `admins.manage`                                                                                                            |
| Input  | `membershipId`, one of: `role` (`admin`\|`content_editor`\|`tribute_moderator`\|`viewer`), or `status` (`suspended`\|`revoked`\|`active`) |
| Output | `{ membershipId, role, status }`                                                                                                          |

## Authentication / Authorization

- `Unauthenticated` / `NotFound`.
- `ForbiddenError` unless `has_memorial_permission(memorialId,'admins.manage')`
  or platform admin.
- **A caller cannot change their own role** (`memberships_guard_owner` trigger
  blocks it unless they hold `admins.manage`, and even then not to/from
  `owner`).

## Validation / Invariants / Preconditions

- Target role ≠ `owner` — reassigning ownership is
  [transferMemorialOwnership](./transfer-memorial-ownership.md) only.
- The target membership is not the memorial's sole active `owner` — the
  last-owner guard raises `insufficient_privilege` (mapped to `ConflictError` /
  `precondition_failed`).
- `revoked` is terminal for that membership; re-adding the person is a fresh
  [invite](./invite-memorial-admin.md).
- Exactly one active owner remains at all times.

## Database interactions / Transaction

`update memorial_memberships set role=? | status=?, revoked_at=(now() if
revoked)` + audit row, one transaction. Trigger `memberships_guard_owner`
enforces the owner invariants.

## Side effects / Events

- **Domain event** `memorial_role.changed` `{ membershipId, memorialId, from, to }`.
- **Audit** `memorial_role.changed`.
- **Notification** to the affected member on a downgrade / suspension /
  revocation (courtesy, not required).

## Errors

`Unauthenticated` · `Forbidden` (incl. self-change) · `NotFound` ·
`ValidationError` (role not allowed) · `ConflictError` / `precondition_failed`
(last owner) · `internal`.

## Idempotency

Setting the role/status it already has → `ConflictError` (no-op) or a silent
success (product choice); no duplicate audit.

## Security considerations

RLS `memberships_update` + the guard together ensure: no self-escalation, no
second owner, no removal of the last owner. Platform admin actions here are
audited with `actor_kind = platform_admin`.

## Related

Entities: `memorial_memberships`. Flow:
[family access / invitation](../../product/flows/family-access-invitation.md).
