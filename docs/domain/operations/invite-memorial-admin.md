# inviteMemorialAdmin

**Status — IMPLEMENTED** (Phase 5K). Executable, unit- and integration-tested.

**Purpose** — Invite another person to help manage a memorial, in a specific
role.

**As built** — the invite is always stored **by email** (`invited_email`,
`profile_id = null`), even when a matching account exists — `authenticated` has
no way to look up a profile by email. The invitee claims it after signing in via
the SECURITY DEFINER `accept_memorial_invite(uuid)` RPC, which checks their
**verified JWT email** against `invited_email`, links the membership to their
profile and activates it (writing its own `memorial_admin.accepted` audit row).
`memorial_invite_preview(uuid)` backs the `/invite/{id}` page. Re-inviting the
same email **updates** the pending row's role (`reinvited: true`). A new invite
records a `channel = 'email'` `notifications` row (Phase 5N) for a delivery
worker to pick up — no such worker exists yet (needs an email provider
decision), so the family still shares the `/invite/{id}` link directly
meanwhile. A stale invite for someone who already joined is rejected by the
RPC (`23505`).

**Business responsibility** — Controlled, audited expansion of a memorial's
team; an invite can exist **before** the invitee has an Evermora account.

## Caller context / Input / Output

|        |                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated; `admins.manage`                                                                                               |
| Input  | `memorialId`, `email`, `role` (`admin` \| `content_editor` \| `tribute_moderator` \| `viewer` — **not** `owner`), `message?` |
| Output | `{ membershipId, status: "invited", role }`                                                                                  |

## Authentication / Authorization

`Unauthenticated` / `NotFound` / `ForbiddenError` unless
`has_memorial_permission(memorialId,'admins.manage')` (owner / admin) or
platform admin.

## Validation / Invariants / Preconditions

- `email` valid; `role` in the allowed set — **`owner` is rejected** (ownership
  moves only via [transferMemorialOwnership](./transfer-memorial-ownership.md);
  RLS `memberships_insert_admins` also enforces `role <> 'owner'`).
- If a profile already exists for `email`: create the membership with
  `profile_id` set, `status='invited'`. Else: create with `invited_email` only.
- One pending invite per (memorial, email) — re-inviting **updates** the pending
  row rather than duplicating (`memorial_memberships_unique_invite`).
- Cannot invite someone who is already an `active` member — `ConflictError`
  (use [changeMemorialRole](./change-memorial-role.md)).

## Database interactions / Transaction

`insert into memorial_memberships (memorial_id, profile_id?, invited_email?,
role, status='invited', invited_by=ctx.userId, invited_at=now())` + audit row,
one transaction.

## Side effects / Events

- **Domain event** `memorial_admin.invited` `{ membershipId, memorialId, role }`.
- **Audit** `memorial_admin.invited`.
- **Notification** `admin_invited`, `channel = 'email'`, recorded for the
  invitee's email address (Phase 5N `notifyByEmail`) — not yet delivered, no
  provider selected.

## Accept-invite (companion operation)

`acceptMemorialInvite(ctx, membershipId | token)` — the invitee (signed in,
`profile_id = auth.uid()`) moves their own membership `invited → active`
(`accepted_at`). RLS `memberships_update` + the `memberships_guard_owner` trigger
allow a member to accept their own invite but not change their own role.

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `ValidationError` (email/role) ·
`ConflictError` (already a member / already invited) · `internal`.

## Idempotency

Re-inviting the same email updates the pending invite (no duplicate, invite
resent). Accepting twice → `ConflictError`.

## Security considerations

Invite tokens are single-use and time-bounded (**PLANNED**). The inviter's
identity is taken from `ctx`, not input. Platform staff can audit all
memberships.

## Related

Entities: `memorial_memberships`, `profiles`, `notifications`. Flow:
[family access / invitation](../../product/flows/family-access-invitation.md).
