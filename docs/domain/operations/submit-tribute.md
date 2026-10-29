# submitTribute

**Status** — done IMPLEMENTED (Phase 5G): `packages/domain/src/operations/submit-tribute.ts`, unit + integration tested.

**Purpose** — A visitor (no account required) leaves a written tribute on a
published memorial.

## Caller context / Input / Output

|        |                                                                                                                   |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| Caller | anyone — `ctx.userId` may be null; `ctx.request.ip` / `.userAgent` are used for anti-abuse and audit only         |
| Input  | `memorialId`, `authorDisplayName`, `authorRelationship?`, `authorEmail?`, `message`, `honeypot?`, `captchaToken?` |
| Output | `{ tributeId, status: "pending" \| "approved" \| "discarded" }`                                                   |

## Moderation (adopted decision — architecture spec §37)

- `feature_settings.tribute_moderation_enabled = true` (default) → the tribute
  is `pending`; it appears only after a moderator approves it.
- `tribute_moderation_enabled = false` → a **valid** tribute becomes `approved`
  with `published_at` set, inside the same transaction. Cleaner than a queue no
  one will look at. The RLS insert policy is widened to permit exactly this
  (`…_tributes_auto_approve.sql`); a submitter can never self-approve on a
  moderated memorial.

## Validation / anti-abuse (architecture spec §36)

- **Honeypot**: a hidden `honeypot` field. If non-empty → return
  `{ tributeId: null, status: "discarded" }` and write nothing.
- **Sanitisation**: `authorDisplayName` and `message` are run through
  `@evermora/utils` `sanitizeLine` / `sanitizePlainText` — HTML tags,
  control / zero-width / bidi characters stripped; stored as plain text.
- **Length**: name 1–120, message 1–5000, relationship ≤ 120 (after sanitising;
  `ValidationError` otherwise). DB `CHECK` constraints back these.
- **Per-IP rate limit**: ≥ 3 submissions to one memorial from one IP in 10
  minutes → `RateLimitedError`. Counted via the SECURITY DEFINER
  `recent_tributes_from_ip` (anon has no SELECT on `tributes`).
- **CAPTCHA**: enforced only when `deps.captcha` is wired. The provider is
  **DEFERRED** — with no adapter, challenges are not enforced (this is **not**
  "bot protection complete").

## Preconditions

- The memorial must be readable by the caller (RLS-scoped `findById` → a
  private / unpublished memorial reads as `MemorialNotFoundError`).
- `feature_settings.tributes_enabled` must be true (`ForbiddenError` otherwise).

## Side effects

- **Audit** `tribute.submitted`, metadata `{ autoApproved }`.
- **Domain event** `tribute.submitted` `{ memorialId, tributeId, autoApproved }`.
- **Notification** when **not** auto-approved: `tribute_submitted` (in-app) to
  every other active memorial member, via `notifyMemorialMembers` (Phase 5N).
  Recipient resolution is elevated (`memorialRecipientIds`) since an anonymous
  submitter has no RLS visibility into `memorial_memberships`. Nothing is sent
  when the tribute auto-approves — there's nothing to moderate.

## Errors

`ValidationError` · `MemorialNotFoundError` · `ForbiddenError` ·
`RateLimitedError` · `PreconditionFailedError` (captcha) · `internal`.

## Idempotency

Not idempotent — each call creates a tribute. Retries are safe-ish because the
family can hide a duplicate; a client dedupe key is a future improvement.

## Related

Entities: `tributes`. Read side: the `public_tributes` SECURITY DEFINER view
(no private columns). Moderation: [moderate-tribute.md](./moderate-tribute.md).
