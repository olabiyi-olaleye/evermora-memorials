# saveStorySection

**Status** — done IMPLEMENTED (Phase 5E): `packages/domain/src/operations/save-story-section.ts`, unit + integration tested.

**Purpose** — Create or update one prose section of a memorial's life story.

## Caller context / Input / Output

|        |                                                                                                                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated family member with `story.edit` (owner / admin / content_editor) or a platform admin                                                                                                                                        |
| Input  | `memorialId`, `id?` (update when present), `kind` (`story_section_kind`, default `custom`), `title` (1–200), `body` (1–20000), `visibility` (`section_visibility`, default `inherit`), `status` (`draft` \| `published`, default `draft`) |
| Output | `{ section, created }`                                                                                                                                                                                                                    |

A new section is appended after the current highest `displayOrder`. "Publishing"
a section is just `status: "published"` — there is no separate publish op.

## Authorization

- `UnauthenticatedError` if `ctx.userId` is null.
- Loaded + permission-checked via `requireMemorialPermission` (`story.edit`);
  RLS `story_sections_write_editors` re-checks underneath.
- The memorial must not be `suspended` / `archived`.

## Side effects

- **Audit** `story_section.created` / `story_section.updated`, metadata `{ status }`.
- No domain event, no notification.

## Errors

`UnauthenticatedError` · `ForbiddenError` · `MemorialNotFoundError` ·
`MemorialInvalidStateError` · `NotFoundError` (unknown `id`, or `id` belongs to
another memorial) · `ValidationError`.

## Idempotency

Update is naturally idempotent. Create is not — send a client dedupe key from
the editor if retries are a concern.

## Related operations

Same file's siblings, same `story.edit` rule and transaction shape:

- **`removeStorySection`** (`remove-story-section.ts`) — soft-delete (`deleted_at`).
  Audit `story_section.removed`.
- **`reorderStorySections`** (`reorder-story-sections.ts`) — `orderedIds` must be
  exactly the memorial's current non-deleted section ids; sets `display_order`
  to the array index. `ValidationError` `reason: "order_mismatch"` otherwise.

## Publish interaction

`publishMemorial` requires a portrait **or** ≥ 1 `published` story section
(`StoryRepository.publishedCount`). See
[publish-memorial.md](./publish-memorial.md).

## Related

Entities: `story_sections`. Public rendering: `apps/web` `MemorialView`.
