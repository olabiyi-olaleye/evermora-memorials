# updateMemorialProfile

**Status** — done IMPLEMENTED (Phase 5C): `packages/domain/src/operations/update-memorial-profile.ts`, unit + integration tested.

**Purpose** — Edit the descriptive "who they were" fields of an existing
memorial from the family portal.

**Business responsibility** — Apply a partial update to the memorial's identity
copy without touching lifecycle, slug, privacy, or feature settings.

## Caller context / Input / Output

|        |                                                                                                                                                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated family member with `memorial.edit` (owner / admin / content_editor) or a platform admin                                                                                                                                                               |
| Input  | `memorialId`, plus any of `fullName` (1–200), `preferredName`, `headline` (≤500), `survivedBy` (≤500), `gender` (`"male" \| "female"`, nullable), `biographySummary` (≤2000), `dateOfBirth`, `birthYearOnly` (boolean), `dateOfDeath`, `birthPlace`, `restingPlace` |
| Output | `{ memorialId, fullName, updatedAt }`                                                                                                                                                                                                                               |

Every editable key is optional. A key that is **absent** is left unchanged; an
**empty string** clears the value (stored as NULL). At least one editable key
must be present (`ValidationError` `reason: "empty_patch"` otherwise).
`gender` isn't free text — its own "clear" is passing `null` directly (no
concept of an empty string); `null` and "never set" render identically
wherever `gender` is read.

## Authentication / Authorization

- `UnauthenticatedError` if `ctx.userId` is null.
- `ForbiddenError` unless the caller has `memorial.edit` or `ctx.isPlatformAdmin`.
- RLS `memorials_update_editors` re-checks `memorial.edit` underneath.

## Validation / Invariants / Preconditions

- `fullName`, when provided, is non-empty ≤ 200.
- After merging the patch with the stored row, `dateOfDeath >= dateOfBirth`
  when both are present (`ValidationError` `reason: "dates_out_of_order"`).
- `birthYearOnly` (merged): when set, `dateOfBirth` is stored as `YYYY-01-01` and
  every renderer shows the year alone. Clearing `dateOfBirth` clears the flag.
- The memorial must not be `suspended` or `archived`
  (`MemorialInvalidStateError`). A `draft` or `published` memorial can be edited.

## Database interactions / Transaction

One transaction: load the memorial (RLS-scoped) → resolve the caller's role →
`update memorials set …` (only the changed columns, no `RETURNING`; the row is
read back) → append an audit row.

## Side effects / Events

- **Audit** `memorial.profile_updated`, entity `memorial`, metadata lists the
  changed field names (never the values).
- **Domain event** none (a profile edit is not yet a notification trigger).
- **Notification** none.

## Errors

`UnauthenticatedError` · `ForbiddenError` · `MemorialNotFoundError` ·
`MemorialInvalidStateError` · `ValidationError` (name / dates / empty patch) ·
`internal`.

## Idempotency

Naturally idempotent — re-sending the same patch produces the same state (and
another audit row).

## Security considerations

Identity comes from `ctx.userId`; nothing in the patch can change ownership,
status, slug, or privacy. Field values are length-bounded before the write.

## Related

Entities: `memorials`.
Flow: [memorial-creation](../../product/flows/memorial-creation.md).
