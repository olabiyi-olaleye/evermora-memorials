# Media & image pipeline

| Concern                                                               | Status                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Object storage = **Supabase Storage**                                 | LOCKED · IMPLEMENTED (5 buckets + policies)                                 |
| Storage namespace = immutable memorial **id**, never names            | LOCKED · IMPLEMENTED                                                        |
| `media` table + album/photo domain operations                         | IMPLEMENTED (Phase 5F)                                                      |
| Upload validation (magic bytes, size, dimensions, EXIF strip)         | IMPLEMENTED (`@evermora/utils` `inspectImage`, server-side)                 |
| Gallery delivery via short-lived **signed URLs** (anon-readable)      | IMPLEMENTED (Phase 5F)                                                      |
| Image **transformation** provider (resize / derivatives / thumbnails) | **DEFERRED** — not selected                                                 |
| Social-preview / OG image generation                                  | DEFERRED — see [performance-architecture.md](./performance-architecture.md) |

This file is the document architecture spec §22 requires (`media-storage.md`).

## Buckets (IMPLEMENTED — `supabase/migrations/…_storage.sql`)

| Bucket             | Public | Size cap | MIME allow-list            | Purpose                                     |
| ------------------ | :----: | -------- | -------------------------- | ------------------------------------------- |
| `memorial-public`  |   done   | 25 MB    | jpeg, png, webp, avif, gif | published portraits & gallery               |
| `memorial-private` |   —    | 25 MB    | images + mp4 + audio       | unpublished / members-only media            |
| `tribute-uploads`  |   —    | 10 MB    | jpeg, png, webp, avif      | visitor tribute media, pre-moderation       |
| `documents`        |   —    | 15 MB    | pdf + images               | programmes, orders of service, certificates |
| `service-assets`   |   —    | 50 MB    | any                        | platform / service operations only          |

## Path convention (LOCKED)

```
{bucket}/{memorial_id}/{purpose}/{filename}
```

e.g. `memorial-public/e1000000-…/portraits/portrait.jpg`. **Never**
`memorial-public/josephine-okafor/…`.

**Why immutable ids, not names/slugs:**

- a family can change the memorial slug or the deceased's displayed name; the
  stored objects must not have to move or break;
- names are not unique and are PII-adjacent — an id in a storage path leaks
  nothing;
- storage authorization keys off the first path segment
  (`app.storage_memorial_id(name)` → UUID, NULL on a malformed name), so it maps
  1:1 to memorial authorization.

## `storage.objects` policies (IMPLEMENTED)

Mirror table authorization — the same `app.*` helpers decide both. Summary in
[storage-architecture.md](./storage-architecture.md):

| Bucket             | read                                                                                                                   | write                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `memorial-public`  | anyone                                                                                                                 | `gallery.manage`                                                                  |
| `memorial-private` | member **or** `anon`/user when `can_read_memorial_section(m,'photos')` **and** a `ready` `media` row exists (Phase 5F) | `gallery.manage`                                                                  |
| `tribute-uploads`  | moderators (`tributes.moderate` / `gallery.manage`)                                                                    | anyone, if memorial readable + `tributes_enabled` + `photo_contributions_enabled` |
| `documents`        | member **or** `can_read_memorial_section(m,'documents')`                                                               | `gallery.manage` or `funeral.manage`                                              |
| `service-assets`   | platform admin                                                                                                         | platform admin                                                                    |

## `media` table (IMPLEMENTED)

`id, memorial_id, album_id?, storage_bucket, storage_path (unique with bucket),
kind (image/video/audio/document), mime_type, byte_size, width, height,
duration_seconds, checksum, title/caption/alt_text, source (family/tribute/
admin/import), visibility (section_visibility), processing_status
(pending/ready/failed), display_order, uploaded_by, timestamps, deleted_at`.

`memorials.portrait_media_id` / `cover_media_id`, `albums.cover_media_id`,
`memorial_people.photo_media_id` reference it (`on delete set null`).

## Upload flow (IMPLEMENTED — Phase 5F, family gallery)

```
family portal → Server Action (multipart FormData, bodySizeLimit 18mb)
  → @evermora/utils inspectImage(bytes):
      magic-byte format detection (NEVER the client MIME / extension)
      allow-list: jpeg | png | webp | gif
      size ≤ 15 MB, max dimension 12 000 px (parsed from the header)
      strip the JPEG APP1 (EXIF) segment → removes embedded GPS
  → authenticated Supabase client uploads the sanitised bytes to
      memorial-private/{memorial_id}/gallery/{uuid}.{ext}   (RLS: gallery.manage)
  → recordMedia domain op writes the `media` row (processing_status = 'ready';
      MVP does no async transforms) inside a transaction
  → on domain failure the object is deleted (best effort)
```

**Delivery.** The public site and the family portal read `media` rows through
RLS, then mint **short-lived signed URLs** (`createSignedUrls`, 30–60 min) for
the objects. The Phase 5F migration `…_media_public_read.sql` broadens the
`memorial-private read` storage policy to `anon` **only** when
`app.can_read_memorial_section(memorial_id, 'photos')` passes **and** a `ready`,
non-deleted `media` row exists for the path — so `apps/web` signs URLs with the
anon key, no service-role. The public gallery shows only photos in a
`published` album; the portrait is `memorials.portrait_media_id`.

**Deferred (image-processing provider):** resized derivatives, `srcset`,
thumbnails, avif/webp transcode, and EXIF stripping for PNG/WebP. Originals are
served as-is with `loading="lazy"` and intrinsic `width`/`height`.

## Choosing the transformation / delivery provider (DEFERRED)

Decision criteria (architecture spec §19, §22):

- public-memorial performance on mobile / slow networks / WhatsApp traffic;
- responsive `srcset` delivery + modern formats (avif/webp);
- CDN caching behaviour and cache invalidation on re-crop;
- **cost**: Supabase image transformations (Pro plan) vs Next.js/Vercel Image
  Optimization vs a combination;
- operational simplicity (one provider vs two);
- social-preview / OG image generation (server-rendered, crawler-visible).

Candidate combinations: (a) Supabase Storage transformations for everything;
(b) Next/Vercel `next/image` over public Supabase URLs; (c) Supabase for
originals + a CDN/transform layer for delivery. The choice is made when media
features are built and recorded here.
