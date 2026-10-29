# Privacy architecture

Two per-memorial rows, auto-created by a trigger on `memorials` insert:
`privacy_settings` and `feature_settings`. Both keyed by `memorial_id`.

## Memorial visibility — `privacy_settings.visibility`

| Value               | Meaning                                                     |
| ------------------- | ----------------------------------------------------------- |
| `private` (default) | Only members & platform admins. Not readable by slug.       |
| `anyone_with_link`  | Readable by anyone who has the slug; not listed/enumerable. |
| `public`            | Readable by anyone; eligible for listing.                   |

`anyone_with_link` and `public` behave identically for a **direct read by slug**
— the slug is the capability. The difference is discoverability (listings,
sitemaps) and is enforced in the application, not RLS.

## Search-engine indexing is separate

`privacy_settings.search_indexing_enabled` — **default `false`**.

> A public URL is **not** automatically search-indexed. `apps/web` must emit
> `noindex` unless this flag is on, independent of `visibility`.

## Per-section privacy — `section_visibility` columns

`family_details`, `funeral_events`, `resting_place`, `photos`, `story`,
`updates`, `documents` each have a `*_visibility` column of type
`section_visibility`:

| Value                                    | Non-member can read?         |
| ---------------------------------------- | ---------------------------- |
| `inherit` (defer to memorial visibility) | yes, if memorial is readable |
| `public`                                 | yes                          |
| `members`                                | no                           |
| `private`                                | no                           |

Defaults: `family_details`, `resting_place`, `documents` → `members`;
everything else → `inherit`. So publishing a memorial does **not** expose family
details or the burial location until the family intentionally changes those.

Enforced by `app.can_read_memorial_section()` and every section table's RLS
`SELECT` policy.

## Feature settings — `feature_settings`

A fixed set of product toggles (not a generic feature-flag engine). Approved
defaults:

| Toggle                        | Default |
| ----------------------------- | ------- |
| `tributes_enabled`            | on      |
| `tribute_moderation_enabled`  | on      |
| `photo_contributions_enabled` | **off** |
| `candles_enabled`             | on      |
| `funeral_enabled`             | on      |
| `family_section_enabled`      | **off** |
| `updates_enabled`             | on      |
| `guestbook_enabled`           | on      |
| `sharing_enabled`             | on      |
| `qr_code_enabled`             | on      |
| `visitor_analytics_enabled`   | on      |

RLS uses `tributes_enabled` / `candles_enabled` / `photo_contributions_enabled`
in the `WITH CHECK` for anonymous submissions and tribute-upload storage.

Writes: `feature_settings` needs `memorial.edit`; `privacy_settings` needs
`privacy.manage`.
