# publishMemorial

**Status** — done IMPLEMENTED (Phase 5A): `packages/domain/src/operations/publish-memorial.ts`, unit + integration tested.

**Purpose** — Make a `draft` memorial publicly addressable at
`evermora.com/{slug}`.

**Business responsibility** — Enforce the minimum-content bar, set
`status = published` + `published_at`, and make the public address live. Funeral
information is **not** required (LOCKED).

## Caller context / Input / Output

|        |                                                                   |
| ------ | ----------------------------------------------------------------- |
| Caller | authenticated; holds `memorial.edit` on the memorial              |
| Input  | `memorialId`, optional `visibility` override                      |
| Output | `{ memorialId, status: "published", canonicalSlug, publishedAt }` |

## Authentication / Authorization

- `UnauthenticatedError` if anonymous.
- `ForbiddenError` unless `has_memorial_permission(memorialId, 'memorial.edit')`
  (owner / admin / content_editor) or platform admin.
- Private memorial the caller can't see → `NotFoundError`.

## Validation / Invariants / Preconditions

- Current `status` must be `draft` → else `ConflictError` (`published`) or
  `precondition_failed` (`archived` / `suspended` / `deleted`).
- Minimum content (Phase 5E — implemented):
  - `full_name` present (always — NOT NULL) **and** a canonical `memorial_slugs`
    row exists (guaranteed by `createMemorial`), **and**
  - a portrait (`memorials.portrait_media_id`) **or** at least one `published`
    story section (`StoryRepository.publishedCount`).
  - Any failure → `precondition_failed` (`reason: "missing_minimum_content"` /
    `"missing_name"`). Still light: one short section is enough — no biography,
    gallery, funeral info or payment is required.
- `published_at` is set by the operation via the injected `Clock` (DB `check`
  `memorials_published_has_timestamp` also enforces it).
- The operation asserts the search-indexing setting is **unchanged** by publish
  (indexing is separate from publication).

## Database interactions / Transaction

One transaction: `update memorials set status='published', published_at=now()`
(+ optional `privacy_settings.visibility`) → trigger
`memorials_audit_status_change` writes `memorial.status_changed`; the operation
also writes its own `memorial.published` audit row.

## Side effects / Events

- **Domain event** `memorial.published` `{ memorialId, canonicalSlug }` — the
  notification service may later use this for "your memorial is live"
  confirmations; there is no visitor notification.
- **Audit** `memorial.published` (+ trigger `memorial.status_changed`).
- Transport should `revalidateTag('memorial:{id}')` after commit
  ([performance-architecture.md](../../architecture/performance-architecture.md)).

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `Conflict` (already published) ·
`precondition_failed` (missing content / bad state) · `internal`.

## Idempotency

Publishing an already-`published` memorial is a `ConflictError`, not a second
publish. Safe to retry after a transient failure.

## Security considerations

Re-check permission against live membership, not stale `ctx`. RLS
`memorials_update_editors` backstops the write; the lifecycle guard blocks
`suspended` transitions here (platform-only).

## Related

Entities: `memorials`, `memorial_slugs`, `privacy_settings`, `story_sections`,
`media`. Flows: [memorial-creation](../../product/flows/memorial-creation.md),
[privacy / visibility UX](../../product/privacy-visibility-ux.md).
