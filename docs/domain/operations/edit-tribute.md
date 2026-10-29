# editTribute

**Status** — done IMPLEMENTED (Phase 6B — tribute-leaving UX): `packages/domain/src/operations/edit-tribute.ts`, unit tested; e2e-covered via `e2e/web/memorial.spec.ts`.

**Purpose** — A visitor (still no account) edits the tribute they previously
left, or adds a new one, proven only by a private edit token.

## Caller context / Input / Output

|        |                                                                    |
| ------ | ------------------------------------------------------------------ |
| Caller | anyone — `ctx.userId` may be null, same as `submitTribute`         |
| Input  | `editToken`, `authorDisplayName`, `authorRelationship?`, `message` |
| Output | `{ tributeId, status: "pending" \| "approved" }`                   |

## Identity / anonymity (adopted decision — tribute-leaving UX redesign)

There is no account, so there is no server-side "is this the same visitor"
check beyond possession of the token:

- `submitTribute` mints `tributes.edit_token` (a random `uuid`, DB default)
  and returns it once in `SubmitTributeResult.editToken`.
- The web app keeps that token client-side only, in `localStorage`
  (`apps/web/src/lib/tribute-storage.ts`) — never in a cookie, never tied to
  an account. Losing the browser/storage loses the ability to edit; that
  trade-off is accepted in exchange for staying fully anonymous.
- Resolution is via `repos.tributes.findByEditToken` / `editByToken`, backed
  by the SECURITY DEFINER RPCs `resolve_tribute_edit_token` /
  `apply_tribute_edit` (`supabase/migrations/20260911100000_tribute_edit_token.sql`)
  — RLS has no concept of "anonymous token ownership", so this is the same
  pattern already used for `resolve_share_token` / `accept_memorial_invite`.
- The token is a bearer credential for that one row only: it grants no read
  or write access to anything else, and does not identify a person.

## Moderation (mirrors submitTribute — architecture spec §37)

An edit **re-enters moderation exactly like a fresh submission**, even if the
tribute was previously `approved`:

- `tribute_moderation_enabled = true` (default) → edited tribute becomes
  `pending` again; `moderated_by` / `moderated_at` / `moderation_note` are
  cleared by `apply_tribute_edit`.
- `tribute_moderation_enabled = false` → the edit auto-approves, same as a
  new submission.

This is deliberate: a moderator who approved the original content should
never end up "vouching for" content the visitor has since changed.

## Validation

Same rules as `submitTribute`: `sanitizeLine` / `sanitizePlainText`, name
1–120, message 1–5000, relationship ≤ 120 (after sanitising) —
`ValidationError` otherwise. No honeypot or rate limit here — editing isn't a
spam vector the way a fresh submission is (the token is already the gate).

## Preconditions

- `findByEditToken` must resolve — an unknown, already-edited-elsewhere, or
  malformed token is **not** distinguished from "expired"; both surface as
  `NotFoundError` ("We couldn't find that tribute. The link may have
  expired.") so a stale token can't be used to probe for valid ones.

## Side effects

- **Audit** `tribute.edited`, metadata `{ newStatus }`.
- **Domain event** `tribute.edited` `{ memorialId, tributeId, autoApproved }`.
- **Notification** when not auto-approved: `tribute_submitted` (in-app,
  `edited: true` in the payload) to other active memorial members, via
  `notifyMemorialMembers` — same recipient-resolution path as
  `submitTribute`.

## Errors

`ValidationError` · `NotFoundError` · `internal`.

## Idempotency

Not idempotent in the CRDT sense — each call overwrites the row's content and
status. Safe to retry: re-submitting the same edit just re-applies the same
state.

## Related

Entities: `tributes` (`edit_token` column). Creation:
[submit-tribute.md](./submit-tribute.md). Moderation:
[moderate-tribute.md](./moderate-tribute.md). Product flow:
[visitor.md](../../product/flows/visitor.md).
