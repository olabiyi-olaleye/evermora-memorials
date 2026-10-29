# Flow — Family access & invitation

**Status — IMPLEMENTED** (Phase 5K). Family surface `/memorials/{id}/family`;
accept page `/invite/{membershipId}`.

**Actors** an `owner` / `admin` (`admins.manage`) and an invitee.
**Goal** let relatives help manage a memorial in the right role, and move
ownership safely when needed.

**As built vs. spec:** invites are always stored **by email** (`invited_email`,
`profile_id` null) — `authenticated` cannot look up a profile by email. The
invitee claims it with the SECURITY DEFINER `accept_memorial_invite(uuid)` RPC,
which matches their **verified JWT email** to `invited_email`. Invitation
**emails are deferred** (Phase 5N) — the family shares the `/invite/{id}` link
shown next to each pending invite. Ownership transfer runs through the
`transfer_memorial_ownership` RPC (the guard + one-owner index otherwise block a
demote/promote).

## Invite → accept

| #   | Screen                   | Action                                                                                                   | System                                                                                                                                                                                                                 |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/memorials/{id}/family` | **Invite** — email + role (`admin` / `content_editor` / `tribute_moderator` / `viewer`; **not** `owner`) | **`inviteMemorialAdmin`**: `invited_email` + `status='invited'`; one pending invite per (memorial, email) — re-invite updates the role; audit `memorial_admin.invited`; notification `admin_invited` **deferred (5N)** |
| 2   | invitee                  | opens the `/invite/{membershipId}` link the family shared                                                | `memorial_invite_preview` shows inviter, memorial, role                                                                                                                                                                |
| 3   | `/invite/{membershipId}` | **Accept invitation** (sign in / sign up first if needed)                                                | `accept_memorial_invite(uuid)` RPC — verifies the JWT email == `invited_email`, links `profile_id`, `status → active`, `accepted_at`; audit `memorial_admin.accepted`; then redirects to the memorial                  |
| 4   | Dashboard                | the memorial now appears for the invitee, scoped to their role                                           |                                                                                                                                                                                                                        |

## Role changes

| Action                                                    | System                                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Change a member's role (e.g. `viewer` → `content_editor`) | **`changeMemorialRole`** — target role ≠ `owner`; caller can't change **their own** role; audit `memorial_role.changed`                        |
| Suspend / remove a member                                 | `status` set to `suspended` or `revoked` (`revoked` is terminal — re-adding is a fresh invite); the last active owner can't be removed (guard) |
| A member leaves voluntarily                               | same as revoke on their own membership; blocked if they're the sole owner                                                                      |

## Ownership transfer

| #   | Screen                 | Action                                                     | System                                                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/family` (owner only) | **Hand over ownership** → pick an existing `active` member | must already be a member (else "invite them first")                                                                                                                                                                                                                                                                                         |
| 2   | Confirm dialog         | confirm                                                    | **`transferMemorialOwnership`** → `transfer_memorial_ownership` RPC — one transaction: demote current owner → `admin`, promote the target → `owner`; the one-active-owner index + guard mean there is never zero or two owners mid-transfer; trigger + op both audit `memorial.ownership_transferred`; new-owner notification deferred (5N) |
| 3   | `/family`              | roles updated; previous owner keeps `admin` access         |                                                                                                                                                                                                                                                                                                                                             |

## Events

audit `memorial_admin.invited` / `memorial_role.changed` /
`memorial.ownership_transferred` · notification `admin_invited` + new-owner
notice · `INVITE_SENT` / `INVITE_ACCEPTED`.

## Edge cases

- **Invitee already a member** → `ConflictError` (use role change instead).
- **Re-invite** → updates the pending invite and resends; no duplicate row.
- **Invite to become `owner`** → rejected (both the domain and RLS
  `memberships_insert_admins` `WITH CHECK role <> 'owner'`).
- **Sole owner tries to leave / be removed / be demoted** → blocked with
  "transfer ownership first".
- **Self-escalation** → blocked (`memberships_guard_owner`), even for someone
  with `admins.manage` they can't lift their own role to/from `owner`.
- **Expired invite token** → "ask the family to re-invite you".
- **Platform staff** can view all memberships for investigation but do not
  appear as members.

## Principles touched

Family-controlled (the family builds its own team) · least privilege (four
non-owner roles) · exactly one owner, always · deliberate, audited ownership
changes.
