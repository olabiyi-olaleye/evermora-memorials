# recordMedia

**Status** — done IMPLEMENTED (Phase 5F): `packages/domain/src/operations/record-media.ts`, unit + integration tested.

**Purpose** — Create the `media` row for a photo the transport layer has
already validated and stored in Supabase Storage.

**Division of labour.** Storage IO and image validation are the transport's
job (a Server Action → `@evermora/utils` `inspectImage` → authenticated
Storage upload). This operation records metadata and enforces authorization;
it never touches storage.

## Caller context / Input / Output

|        |                                                                                                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caller | authenticated family member with `gallery.manage` (owner / admin / content_editor) or a platform admin                                                                                   |
| Input  | `memorialId`, `albumId?`, `storageBucket` (`memorial-private`), `storagePath`, `mimeType` (image/\*), `byteSize`, `width?`, `height?`, `checksum?`, `caption?`, `altText?`, `visibility` |
| Output | `{ media }`                                                                                                                                                                              |

`storagePath` **must** start with `${memorialId}/` (§19 — the storage
namespace is the immutable id, never a name). `processing_status` is set to
`ready` — the MVP does no async transforms.

## Authorization / Errors

`requireMemorialPermission(gallery.manage)`; RLS `media_write_gallery`
re-checks. `UnauthenticatedError` · `ForbiddenError` · `MemorialNotFoundError`
· `MemorialInvalidStateError` (suspended / archived) · `NotFoundError` (unknown
`albumId`) · `ValidationError` (`reason: "path_mismatch"` / bad mime / size).

## Side effects

- **Audit** `media.added`, metadata `{ bytes, mime }`.

## Related operations

- **`updateMedia`** — caption / alt text / album / visibility (partial patch,
  `reason: "empty_patch"` if nothing given). Audit `media.updated`.
- **`removeMedia`** — soft-delete; clears a portrait / album-cover reference
  that points at this photo; **returns `{ storageBucket, storagePath }`** so
  the transport can delete the object. Audit `media.removed`.
- **`reorderMedia`** — `orderedIds` is a subset of the memorial's current
  media ids (no duplicates, no unknown ids); sets `display_order`.

## Publish interaction

A portrait (`memorials.portrait_media_id`, set via
[setMemorialPortrait](./set-memorial-portrait.md)) satisfies the
`publishMemorial` minimum-content bar on its own.

## Related

Entities: `media`, `albums`. Architecture:
[media-storage.md](../../architecture/media-storage.md).
