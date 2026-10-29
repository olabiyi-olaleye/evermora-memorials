# saveAlbum

**Status** — done IMPLEMENTED (Phase 5F): `packages/domain/src/operations/save-album.ts`, unit + integration tested.

**Purpose** — Create or update a photo album (a named grouping of `media`).

## Caller context / Input / Output

|        |                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Caller | authenticated family member with `gallery.manage` or a platform admin                                                                                                    |
| Input  | `memorialId`, `id?`, `title` (1–160), `description?` (≤2000), `visibility` (`section_visibility`, default `inherit`), `status` (`draft` \| `published`, default `draft`) |
| Output | `{ album, created }`                                                                                                                                                     |

The public gallery shows photos **only** in a `published` album.

## Authorization / Side effects / Errors

`requireMemorialPermission(gallery.manage)`; RLS `albums_write_gallery`.
Audit `album.created` / `album.updated`.

## Related operations

- **`removeAlbum`** — soft-deletes the album and **detaches** its photos
  (`media.album_id → null`); the photos themselves are kept. Audit
  `album.removed`.

## Related

Entities: `albums`, `media`.
