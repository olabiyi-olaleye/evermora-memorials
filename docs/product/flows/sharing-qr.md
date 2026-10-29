# Flow — Sharing & QR

**Status — IMPLEMENTED** (Phase 5J). Family surface at `/memorials/{id}/share`;
visitor QR landing at `apps/web` `/q/{token}`.

**Actors** a family member (`memorial.edit`) sharing, and any visitor arriving.
**Goal** get the memorial in front of people, and make **printed** QR codes work
forever — even if the slug or name changes later.

QR images are generated locally as self-contained SVG (`@evermora/utils`
`qrSvg`, backed by `qrcode-generator`) — **no external image service**. The
family downloads the SVG for print. Aggregate `QR_OPENED` analytics are
deferred (Phase 5N/5O).

## Share a link

| #   | Screen                  | Action                                                                       | System                                                                                    |
| --- | ----------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | `/memorials/{id}/share` | see the public URL (only once the memorial is published + `sharing_enabled`) | `NEXT_PUBLIC_APP_URL` + canonical slug; the OG card is server-rendered on the public page |
| 2   | Share                   | **Copy link** / **Share on WhatsApp** (`wa.me`) / **More…** (Web Share API)  | shares `evermora.com/{canonical_slug}`                                                    |
| 3   | recipient               | opens the link                                                               | 301 from any alias → canonical; renders the memorial                                      |

## Generate a QR / share asset

| #   | Screen                  | Action                                                                                                                           | System                                                                                                                                                                                 |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/memorials/{id}/share` | **Create a QR code** → medium (funeral programme / memorial card / banner / reception table / keepsake / other) + optional label | requires `qr_code_enabled`                                                                                                                                                             |
| 2   | (system)                |                                                                                                                                  | **`generateShareAsset`** → `share_resolvers` row with a permanent unguessable `token` (`randomBytes(9)` hex, in the persistence adapter); audit + domain event `share_asset.generated` |
| 3   | Share                   | the QR renders inline as SVG; **Download SVG**                                                                                   | the QR encodes `{APP_URL}/q/{token}`, generated locally by `@evermora/utils` `qrSvg` — no external service                                                                             |
| 4   | Share                   | later: **Retire** a code (a print run is superseded)                                                                             | **`retireShareAsset`** → `is_active = false` / `retired_at`; the row is **kept** so an old printed card still resolves gracefully; audit `share_asset.retired`                         |

## Visitor scans a printed QR

```
printed QR  →  evermora.com/q/{token}
            →  resolve_share_token(token)  →  (memorial_id, canonical_slug, is_active)
            →  active   : 302 → evermora.com/{canonical_slug}
               retired  : gentle "this memorial has moved or been archived" + link home
               unknown  : 404
```

The token never encodes a slug, so **changing the slug, the displayed name, or
internal routing does not break any printed artifact**.

## Events

`MEMORIAL_SHARED` (step 2 / asset generated) · `QR_OPENED` (visitor scan) ·
audit `share_asset.generated`.

## Edge cases

- **Memorial not published yet** — sharing tools are disabled with an
  explanation; the public URL doesn't resolve until publish.
- **`sharing_enabled` off** — share affordances hidden on both the portal and
  the public memorial.
- **Slug changed after printing** — the printed QR (via `/q/{token}`) keeps
  working; a printed _plain URL_ with the old slug still 301s to the new one
  (aliases are never recycled).
- **Memorial archived/suspended after printing** — the resolver still resolves;
  the public page shows the respectful "not available" state.
- **Multiple print runs** — each gets its own `share_resolvers` row/token; the
  family can retire a specific artifact without affecting the others.
- **QR image generation** — local SVG (`qrcode-generator`), byte mode, EC level
  `M`, 4-module quiet zone; downloaded for print
  ([../../architecture/memorial-url-architecture.md](../../architecture/memorial-url-architecture.md)).

## Principles touched

Printed artifacts are permanent · identity ≠ address · respectful fallback for a
scanned code that points at an archived memorial · no tracking of the individual
who scanned (aggregate `QR_OPENED` only).
