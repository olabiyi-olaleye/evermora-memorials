# Validation principles

Three lines of defence, each independent:

```
Zod input schema   →   domain invariants   →   database constraints + triggers
(shape, at the edge)   (cross-field, stateful)   (last-line, always on)
```

## 1. Input schema (Zod)

- Every operation defines a Zod schema for its input. The transport may
  pre-parse the request body; the **domain re-parses** — it never trusts a
  shape it didn't validate.
- Schemas live with the operation in `@evermora/domain`. Shared field schemas
  (slug candidate, email, non-empty short text, importance enum) are factored
  out.
- Parse failure → `ValidationError` with `details` mapping field → message.
- Coerce and normalise here: trim strings, lowercase emails, drop empty
  optionals.

## 2. Domain invariants

Rules Zod can't express alone, checked after loading current state:

- `date_of_death >= date_of_birth`; a funeral event's `end_time >= start_time`.
- slug policy — normalise, then `slug_is_valid` grammar (3–63, lowercase
  `a-z0-9-`, no edge/double hyphen, at least one letter), not reserved, not
  already taken; on change, the old canonical becomes a retired alias (never
  deleted).
- a memorial keeps **exactly one active owner**; ownership only moves via
  `transferMemorialOwnership`.
- publishing requires the minimum content the product defines (e.g. full name +
  at least one of portrait/story) — funeral information is **not** required
  (LOCKED).
- a tribute is created only as `pending`, unmoderated; moderation fields are set
  only by the moderation operations.
- feature/privacy preconditions: `tributes_enabled` to accept a tribute,
  `candles_enabled` for a remembrance, etc. → `precondition_failed`.

## 3. Database (backstop — IMPLEMENTED)

`check` constraints, `not null`, enum types, partial unique indexes, the slug
trigger, the integrity guards, and RLS. Even if a domain check regresses, the
write fails at Postgres and the domain surfaces `internal` / `forbidden` — it
never silently succeeds. See
[data-model.md](../architecture/data-model.md) and
[rls-architecture.md](../architecture/rls-architecture.md).

## Text & content

- Length limits mirror the DB (`author_display_name` ≤ 120, tribute `message`
  1–5000, titles ≤ 200, update/remembrance bodies bounded).
- Store text as entered; **escape on render** (never store pre-escaped). Sanitise
  or reject HTML in free-text fields; render as plain text / a constrained
  markup subset.
- Normalise and validate URLs (`livestream_url`, external links); reject
  `javascript:` / `data:`; render external links with
  `rel="noopener noreferrer nofollow"`
  ([security-architecture.md](../architecture/security-architecture.md)).

## Anonymous input

Visitor submissions (tribute, remembrance, report, service request) get the
same schema + invariant treatment, plus rate limiting and bot defence
(**PLANNED**), and RLS `WITH CHECK` constrains the row regardless.
