# Storage architecture

Supabase Storage. Buckets and `storage.objects` policies are created in
`supabase/migrations/…_storage.sql`.

## Path convention

```
{bucket}/{memorial_id}/{purpose}/{file}
```

**Immutable ids only** — never a deceased person's or family's name. Example:
`memorial-public/e1000000-…/portraits/portrait.jpg`, never
`memorial-public/josephine-okafor/…`. `app.storage_memorial_id(name)` extracts
the leading UUID from an object name (NULL on malformed names).

## Buckets

| Bucket             | Public | Size cap | MIME allow-list    | Use                                              |
| ------------------ | :----: | -------- | ------------------ | ------------------------------------------------ |
| `memorial-public`  |  done  | 25 MB    | images             | published portraits & gallery                    |
| `memorial-private` |   —    | 25 MB    | images, mp4, audio | unpublished / members-only media                 |
| `tribute-uploads`  |   —    | 10 MB    | images             | visitor-submitted tribute media (pre-moderation) |
| `documents`        |   —    | 15 MB    | pdf, images        | programmes, orders of service, certificates      |
| `service-assets`   |   —    | 50 MB    | any                | platform/service operations only                 |

## `storage.objects` policies

| Bucket             | read                                                                                                            | write / modify / delete                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `memorial-public`  | anyone                                                                                                          | `gallery.manage` on the path's memorial                                                                               |
| `memorial-private` | member **or** (`can_read_memorial_section(m,'photos')` **and** a `ready` `media` row) — incl. `anon` (Phase 5F) | `gallery.manage`                                                                                                      |
| `tribute-uploads`  | `tributes.moderate` or `gallery.manage` (moderation)                                                            | **insert:** anyone, if memorial readable + `tributes_enabled` + `photo_contributions_enabled`; **delete:** moderators |
| `documents`        | member **or** `can_read_memorial_section(m,'documents')`                                                        | `gallery.manage` or `funeral.manage`                                                                                  |
| `service-assets`   | platform admin                                                                                                  | platform admin                                                                                                        |

Storage authorization therefore mirrors table authorization: the same
`app.*` helper functions decide both. A private memorial's assets are
unreachable without a membership; a suspended memorial's public assets follow
`can_read_memorial`.

## Upload validation (IMPLEMENTED — Phase 5F, family gallery)

A Server Action runs `@evermora/utils` `inspectImage` on the raw bytes before
anything is stored: magic-byte format detection (never the client MIME or the
extension), a `jpeg | png | webp | gif` allow-list, a 15 MB cap, a 12 000 px
max dimension parsed from the file header, and JPEG **EXIF/GPS stripping**.
The sanitised bytes are uploaded with the authenticated client (RLS:
`gallery.manage`) to `memorial-private/{memorial_id}/gallery/{uuid}.{ext}`,
then `recordMedia` writes the `media` row (`processing_status = 'ready'`; no
async transforms in the MVP). Delivery is via short-lived signed URLs.

## Image transformation

Provider **deferred** (architecture spec §22): resized derivatives, `srcset`,
thumbnails, avif/webp transcode. `media` carries `width`, `height`,
`byte_size`, `checksum` so a transformation/CDN layer can be added without a
schema change.
