# changeMemorialSlug

**Status** — done IMPLEMENTED (Phase 5A): `packages/domain/src/operations/change-memorial-slug.ts`, unit + integration tested.

**Purpose** — Change the visible public address of a memorial
(`evermora.com/josephine-okafor` → `evermora.com/mama-josephine`) **without**
breaking any existing link or the memorial's identity.

**Business responsibility** — Promote a new canonical slug, retire the old one
as a permanent 301 alias, and keep every printed QR / shared link working.

## Caller context / Input / Output

|        |                                                                         |
| ------ | ----------------------------------------------------------------------- |
| Caller | authenticated; `memorial.edit`                                          |
| Input  | `memorialId`, `newSlug` candidate                                       |
| Output | `{ memorialId, canonicalSlug: newSlug, previousCanonical, aliasCount }` |

## Authentication / Authorization

`Unauthenticated` / `Forbidden` (`memorial.edit`) / `NotFound`. Platform admin
also permitted.

## Validation / Invariants / Preconditions

- Normalise `newSlug` → `slug_is_valid` grammar → not reserved
  (`reserved_slugs`) → not owned by **another** memorial. `ValidationError` /
  `ConflictError`.
- `newSlug` equals the current canonical → `ConflictError` (no-op).
- `newSlug` is already an **alias of this memorial** → re-promote it (clear
  `retired_at`, set `is_canonical`), don't insert a duplicate.
- Invariant: exactly one `is_canonical` row per memorial at all times
  (`memorial_slugs_one_canonical` partial unique index).
- The previous canonical row is **retired, never deleted** — historical URLs are
  not recycled.

## Database interactions / Transaction

One transaction:

1. `update memorial_slugs set is_canonical=false, retired_at=now() where memorial_id=? and is_canonical`
2. upsert the new canonical row (`is_canonical=true`, `redirect_enabled` n/a) —
   trigger `memorial_slugs_validate` re-checks grammar + reserved;
   `memorial_slugs_guard_retired` forbids a retired row being canonical.
3. audit row.

## Side effects / Events

- **Domain event** `memorial.slug_changed` `{ memorialId, from, to }`.
- **Audit** `memorial.slug_changed` with `{ from, to }`.
- Transport: `revalidateTag('memorial:{id}')`; the old path now 301s to the new
  canonical via `resolve_memorial_slug`.
- QR: unaffected — `share_resolvers.token` → memorial id → new canonical
  ([memorial-url-architecture.md](../../architecture/memorial-url-architecture.md)).

## Errors

`Unauthenticated` · `Forbidden` · `NotFound` · `ValidationError` (grammar) ·
`ConflictError` (reserved / taken / same slug) · `internal`.

## Idempotency

Changing to the current canonical → `ConflictError` (no-op). Re-running after a
partial-looking failure is safe — the one-canonical invariant makes a partial
state impossible.

## Security considerations

Grammar + reserved-word enforcement is in the DB trigger, so a bypass of the
domain check cannot store an unsafe or reserved slug. Rate-limit slug changes
(anti-abuse) — **PLANNED**.

## Related

Entities: `memorial_slugs`, `reserved_slugs`, `share_resolvers`. Flow:
[sharing / QR](../../product/flows/sharing-qr.md).
