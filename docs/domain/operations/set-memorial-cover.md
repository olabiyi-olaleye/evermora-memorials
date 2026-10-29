# setMemorialCover

**Status** — done IMPLEMENTED (Phase 6B — memorial share image): `packages/domain/src/operations/set-memorial-cover.ts`, unit + integration tested.

**Purpose** — Choose (or clear) the image used for the memorial's link-preview
card (WhatsApp/iMessage/Slack/etc.), independent of the portrait shown on the
memorial page itself.

## Caller context / Input / Output

|        |                                                                                |
| ------ | ------------------------------------------------------------------------------ |
| Caller | authenticated family member with `memorial.edit` or a platform admin           |
| Input  | `memorialId`, `mediaId` (a `ready` photo of this memorial, or `null` to clear) |
| Output | `{ coverMediaId }`                                                             |

`memorial.edit` (not `gallery.manage`) because the write lands on `memorials`
— matches the `memorials_update_editors` RLS policy. Identical shape to
[setMemorialPortrait](./set-memorial-portrait.md) by design; the two are
otherwise unrelated — a memorial can have a portrait, a cover, both, or
neither, independently.

## Why this exists, separate from the portrait

The portrait is what a _visitor_ sees leading the memorial page. The cover is
what a _link_ looks like before anyone taps it — a family may reasonably want
a different photo to represent the person in a shared preview than the one
leading the page, or (this is the common case) no deliberate choice at all,
in which case `apps/web`'s `share-image.tsx` builds the card from a fallback
chain it owns: cover → portrait → first photo in a published album →
initials. That fallback logic is a public-read-layer concern, not this
operation's.

`memorials.cover_media_id` has existed in the schema since the very first
migration (`0005 · memorials, memorial_people`) but was never wired into the
domain, database, or family-portal layers until this operation.

## Validation / Errors

- `mediaId`, when given, must be a non-deleted `media` row of this memorial
  (`NotFoundError`) with `processing_status = 'ready'`
  (`PreconditionFailedError` `reason: "media_not_ready"`).

## Side effects

- **Audit** `memorial.cover_changed`, metadata `{ coverMediaId }`.

## Publish interaction

Unlike the portrait, a cover image does **not** satisfy the `publishMemorial`
minimum-content bar — it never appears on the page a visitor reads, so it
shouldn't count as "there's something here to publish." `removeMedia` clears
this reference (alongside the portrait, if set) if the cover photo is
deleted.

## Related

Entities: `memorials`, `media`. Family-portal: the "Use as share image"
button on Photos & memories, next to "Make portrait". Public read: the
fallback chain in `apps/web/src/lib/share-image.tsx`.
