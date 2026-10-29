# setMemorialPortrait

**Status** — done IMPLEMENTED (Phase 5F): `packages/domain/src/operations/set-memorial-portrait.ts`, unit + integration tested.

**Purpose** — Choose (or clear) the portrait shown at the top of the memorial.

## Caller context / Input / Output

|        |                                                                                |
| ------ | ------------------------------------------------------------------------------ |
| Caller | authenticated family member with `memorial.edit` or a platform admin           |
| Input  | `memorialId`, `mediaId` (a `ready` photo of this memorial, or `null` to clear) |
| Output | `{ portraitMediaId }`                                                          |

`memorial.edit` (not `gallery.manage`) because the write lands on `memorials`
— matches the `memorials_update_editors` RLS policy.

## Validation / Errors

- `mediaId`, when given, must be a non-deleted `media` row of this memorial
  (`NotFoundError`) with `processing_status = 'ready'`
  (`PreconditionFailedError` `reason: "media_not_ready"`).

## Side effects

- **Audit** `memorial.portrait_changed`, metadata `{ portraitMediaId }`.

## Publish interaction

A portrait satisfies the `publishMemorial` minimum-content bar on its own
(no published story section needed). `removeMedia` clears this reference if the
portrait photo is deleted.

## Related

Entities: `memorials`, `media`.
