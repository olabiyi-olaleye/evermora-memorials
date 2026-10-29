# Flow — Visitor

**Actor** an anonymous visitor (a mourner, a colleague, extended family).
**Goal** read the memorial, see the funeral details, leave a message — **without
an account** (LOCKED).

## Preconditions

- The memorial is `published` and its visibility is `public` or
  `anyone_with_link`.
- The visitor has a link, a QR code, or (if indexing is on) found it via search.

## Steps

| #   | Screen                                                                             | Action                                                                                    | System                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | any link / QR                                                                      | open the URL                                                                              | if `/q/{token}` → `resolve_share_token` → 302 to `/{canonical}`; if an alias slug → 301 to `/{canonical}`; unknown → respectful 404                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2   | Public memorial `/{slug}`                                                          | (arrives)                                                                                 | cached server render; sections filtered by `can_read_memorial_section` for an anonymous viewer; social/OG meta already in the HTML; if tributes are enabled and this browser hasn't submitted or skipped recently, the **Leave a tribute** prompt (Phase 6B) opens automatically as a modal — the first thing the visitor sees                                                                                                                                                                                                                                                 |
| 3   | Public memorial                                                                    | scroll: portrait → message → story → gallery → tributes → funeral → updates → remembrance | gallery tap → lightbox (JS loads on demand); funeral event shows date/venue/map link/livestream link; a **cancelled** event is shown clearly as cancelled; the same tribute form also lives inline at the **Tributes** section, in its normal page position, whether or not the modal was skipped                                                                                                                                                                                                                                                                              |
| 4a  | Public memorial → **Leave a tribute** (modal or inline, IMPLEMENTED Phase 5G / 6B) | display name, relationship, message, optional email — or **Skip for now**                 | Server Action → `submitTribute` (honeypot, per-IP rate limit, plain-text sanitisation, CAPTCHA adapter deferred). Moderated memorial → `pending`; visitor sees "sent to the family". `tribute_moderation_enabled = false` → auto-`approved` in the same transaction (§37). `tribute.submitted` event → moderator notification (later). On success, a private `editToken` is saved to this browser's `localStorage` only (no account, no cookie) so the prompt doesn't ask again and the visitor can edit later; Skip is remembered for a few days, then the prompt asks again. |
| 4a′ | Public memorial → **Tributes**, returning submitter                                | **Edit your tribute**                                                                     | `editTribute`, authorized only by the `editToken` this browser already holds ([edit-tribute.md](../../domain/operations/edit-tribute.md)) — re-enters moderation exactly like a fresh submission, even if it was already approved. No delete; a visitor may also just leave another tribute instead.                                                                                                                                                                                                                                                                           |
| 4b  | Public memorial → **Light a candle**                                               | pick a gesture, optional name/message                                                     | `remembrance_actions` insert (RLS: `candles_enabled`); optimistic count bump; a `visitor_session` token prevents an accidental duplicate of the same gesture                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 4c  | Public memorial → **Report** (subtle) or a tribute's ⋯ menu                        | reason + optional details + optional email                                                | `reportMemorial` → `reports` insert; if a tribute, it's set to `reported`; `memorial_reported` to staff; visitor sees "our team will review this" — **no public signal**                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5   | Public memorial → **Share**                                                        | native share sheet / copy link                                                            | shares the canonical public URL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 6   | (later) Public memorial                                                            | revisit                                                                                   | approved tributes now visible; new family updates shown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Events

`FIRST_VISITOR` (first ever view) · `QR_OPENED` (via step 1) ·
`FUNERAL_EVENT_VIEWED` · `TRIBUTE_SUBMITTED` · `REMEMBRANCE_LEFT`. All aggregate,
no per-visitor identity ([../analytics.md](../analytics.md)).

## Edge cases

- **Private / draft / archived / suspended / missing memorial** → "This memorial
  isn't available" — never a login prompt, never confirmation that it exists.
- **`anyone_with_link`** — behaves like public for a direct visit; just not
  listed/indexed.
- **Indexing off** (default) — the page serves `noindex`; a search engine won't
  list it even though the URL works.
- **Tributes disabled** — no "leave a tribute" affordance; a direct POST is
  rejected by RLS.
- **Photo contributions disabled** — the tribute form has no photo field; a
  direct upload to `tribute-uploads` is rejected by the storage policy.
- **Spam / abusive submission** — rate limiting + bot check (PLANNED) throttle
  it; it lands as `pending` and never appears publicly; a moderator rejects it;
  the `reports` workflow is the human backstop.
- **Slow network / WhatsApp** — first paint is portrait + name + dates + message
  with near-zero JS ([../../architecture/performance-architecture.md](../../architecture/performance-architecture.md)).
- **Visitor's own email** — captured only if they give it, kept private
  (`tributes.author_email` never reaches the Data API), used once to say "your
  tribute is live".

## Principles touched

Visitors need no account · respectful (no counters, no "be the first!") · privacy
(their email is private; reports are silent) · mobile-first / WhatsApp entry.
