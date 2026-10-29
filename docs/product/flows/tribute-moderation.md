# Flow — Tribute moderation

**Actor** `owner`, `admin`, or `tribute_moderator` on the memorial (also
platform staff, on any memorial).
**Goal** decide which visitor tributes appear publicly, quickly and calmly.

## Preconditions

- The memorial exists; `tributes_enabled` is on; at least one tribute has been
  submitted (`pending`), or a tribute was `reported`.
- The moderator has an `active` membership with `tributes.moderate`.

## Steps

| #   | Screen                                              | Action                                                                                               | System                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Notification (in-app) / Dashboard "needs attention" | tap "N tributes waiting"                                                                             | opens `/memorials/{id}/tributes` (Pending tab)                                                                                                                                                                                                                                                                                             |
| 2   | Moderation queue                                    | read a tribute: display name, relationship, **email (moderator-only)**, message, photo, submitted-at | queue reads the base `tributes` table (members only); private columns fetched server-side via `service_role`                                                                                                                                                                                                                               |
| 3a  | Queue                                               | **Approve** (optionally a note)                                                                      | **`approveTribute`**: `status='approved'`, `published_at`, `moderated_by/at`; audit `tribute.approved`; domain event `tribute.approved`; notification `tribute_approved` to the author **iff** they left an email; `revalidateTag('memorial:{id}:tributes')` — the tribute appears on the public memorial via `public_tributes` (no email) |
| 3b  | Queue                                               | **Reject** (reason required, internal)                                                               | **`rejectTribute`**: `status='rejected'`; audit `tribute.rejected`; **no notification** (don't feed a spammer); never public                                                                                                                                                                                                               |
| 3c  | Approved tab                                        | **Hide** an already-public tribute (a complaint, a later problem)                                    | **`hideTribute`**: `status='hidden'`; keeps `published_at`; audit `tribute.hidden`; removed from `public_tributes` immediately                                                                                                                                                                                                             |
| 3d  | Reported tab                                        | review a visitor-reported tribute                                                                    | the tribute is `reported`; moderator chooses Hide or dismiss; a platform `reports` row may also exist                                                                                                                                                                                                                                      |
| 4   | Queue                                               | **Restore** a hidden/rejected item                                                                   | re-run `approveTribute` (allowed from a non-`pending` state) → back to public                                                                                                                                                                                                                                                              |
| 5   | Queue                                               | bulk-select pending → **Approve**                                                                    | one `approveTribute` per row; a co-moderator acting on the same row gets a conflict and a refresh                                                                                                                                                                                                                                          |

## Events

`TRIBUTE_APPROVED` · audit `tribute.approved` / `tribute.rejected` /
`tribute.hidden` · notification `tribute_approved`.

## Edge cases

- **Moderation turned off mid-stream** (`tribute_moderation_enabled = false`) —
  new tributes still land as `pending` at the DB; the product may auto-approve
  via the domain layer, but the DB default is unchanged. Existing pending
  tributes still need a decision.
- **Two moderators, same tribute** — the second `approveTribute` on an
  already-approved row returns `ConflictError`; the UI refreshes; no double
  notification.
- **Tribute with an abusive photo** — Hide/Reject also removes the
  `tribute-uploads` object (moderator storage-delete policy).
- **Author email bounces** — the notification service's problem; the approval
  is not rolled back.
- **Content editor tries to moderate** — no queue actions available; a direct
  `UPDATE` is rejected by RLS (`tributes_update_moderators`).
- **Platform staff moderating** — same operations, `actor_kind = platform_admin`
  in the audit; used for policy violations across memorials.

## Principles touched

Family-controlled (the family decides what's shown) · respectful (rejection is
quiet) · privacy (submitter email never leaves the server) · no social mechanics
(approve/hide, not "feature"/"pin").
