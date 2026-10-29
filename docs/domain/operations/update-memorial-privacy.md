# updateMemorialPrivacy

**Status** — done IMPLEMENTED (Phase 5C): `packages/domain/src/operations/update-memorial-privacy.ts`, unit + integration tested.

**Purpose** — Set the memorial-level visibility and the separate search-engine
indexing toggle.

**Business responsibility** — Keep visibility and search indexing as two
independent concerns, and never let a non-public memorial stay in a search
index.

## Caller context / Input / Output

|        |                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated family member with `privacy.manage` (owner / admin) or a platform admin                         |
| Input  | `memorialId`, plus any of `visibility` (`public` \| `anyone_with_link` \| `private`), `searchIndexingEnabled` |
| Output | `{ memorialId, visibility, searchIndexingEnabled }`                                                           |

## Authentication / Authorization

- `UnauthenticatedError` if `ctx.userId` is null.
- `ForbiddenError` unless the caller has `privacy.manage` or `ctx.isPlatformAdmin`
  — a `content_editor` cannot change privacy.
- RLS `privacy_settings_update` re-checks `privacy.manage` underneath.

## Validation / Invariants / Preconditions

- At least one of `visibility` / `searchIndexingEnabled` must be present.
- **Search indexing is only allowed while `visibility = public`.** A request to
  enable indexing on a non-public memorial is silently kept off; changing
  visibility away from `public` forces `searchIndexingEnabled = false`.
- The memorial must not be `suspended`.
- Publishing state is untouched — visibility and lifecycle are independent.
- Section-level visibility is out of scope (future phase).

## Database interactions / Transaction

One transaction: load memorial + role → read current `privacy_settings` →
compute the effective next state → `update privacy_settings` (only if something
changed) → audit row.

## Side effects / Events

- **Audit** `memorial.privacy_changed`, metadata `{ visibility, searchIndexingEnabled }`.
- **Domain event** none yet.
- **Notification** none.

## Errors

`UnauthenticatedError` · `ForbiddenError` · `MemorialNotFoundError` ·
`MemorialInvalidStateError` (suspended) · `ValidationError` (empty patch /
bad enum) · `internal` (missing settings row).

## Idempotency

Idempotent — re-sending the same target state is a no-op (no audit row when
nothing changes).

## Security considerations

A public URL is **not** automatically indexable. Downgrading visibility always
clears indexing so an unlisted or private memorial cannot linger in a crawler
index.

## Related

Entities: `privacy_settings`.
Docs: [privacy-architecture.md](../../architecture/privacy-architecture.md).
