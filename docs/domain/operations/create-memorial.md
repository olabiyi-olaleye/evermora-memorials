# createMemorial

**Status** — done IMPLEMENTED (Phase 5A): `packages/domain/src/operations/create-memorial.ts`, unit + integration tested.

**Purpose** — Create a new memorial in `draft` for the signed-in family member.

**Business responsibility** — Establish the memorial's immutable identity, make
the creator its sole `owner`, provision default settings, and reserve the first
canonical slug.

## Caller context / Input / Output

|        |                                                                                                                                                                              |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated family member (`ctx.userId` required)                                                                                                                          |
| Input  | `fullName` (1–200), `preferredName?`, `dateOfBirth?`, `dateOfDeath?`, `birthPlace?`, `headline?`, `slug` candidate (or derived from name), `visibility?` (default `private`) |
| Output | `{ memorialId, canonicalSlug, status: "draft" }`                                                                                                                             |

## Authentication / Authorization

- `UnauthenticatedError` if `ctx.userId` is null.
- No memorial-level permission needed — anyone signed in may create a memorial.
- The creator becomes `owner` (see invariants).

## Validation / Invariants / Preconditions

- `fullName` non-empty ≤ 200; `dateOfDeath >= dateOfBirth` when both present.
- Slug: normalise → `slug_is_valid` grammar → not reserved → not taken
  (`slug_is_available`). `ValidationError` otherwise.
- Exactly one `active` `owner` membership is created for `ctx.userId`.
- `feature_settings` + `privacy_settings` rows exist afterwards (DB trigger
  `memorials_provision_settings`).

## Database interactions / Transaction

One transaction:

1. `insert into memorials (…, created_by = ctx.userId, status = 'draft')`
   — triggers: `memorials_grant_creator_owner` (owner membership),
   `memorials_provision_settings` (settings rows).
2. `insert into memorial_slugs (memorial_id, slug, is_canonical = true, created_by)`
   — trigger `memorial_slugs_validate` enforces grammar + reserved check.
3. audit row.

## Side effects / Events

- **Domain event** `memorial.created` `{ memorialId }`.
- **Audit** `memorial.created`, entity `memorial`.
- **Notification** none.

## Errors

`UnauthenticatedError` · `ValidationError` (name/dates/slug) ·
`ConflictError` (slug taken in a race) · `internal`.

## Idempotency

Not idempotent — each call creates a memorial. The creation wizard **should**
send a client dedupe key to make retries safe.

## Security considerations

`created_by` is taken from `ctx.userId`, never from input. RLS
`memorials_insert_by_creator` re-checks `created_by = auth.uid()`.

## Related

Entities: `memorials`, `memorial_memberships`, `memorial_slugs`,
`feature_settings`, `privacy_settings`.
Flow: [memorial-creation](../../product/flows/memorial-creation.md).
