# Domain errors

Domain operations signal failure by **throwing** a `DomainError` (or a
subclass). Transports catch it and map it to their own concern — an HTTP status,
a Server Action form error — but the domain never speaks HTTP.

Source: `packages/domain/src/errors.ts` (IMPLEMENTED).

## Taxonomy

```ts
type DomainErrorCode =
  | "unauthenticated" // no caller identity
  | "forbidden" // caller lacks the permission
  | "not_found" // target missing (or hidden from this caller)
  | "validation" // input failed schema / cross-field rules
  | "conflict" // action conflicts with current state
  | "precondition_failed" // a required condition isn't met (e.g. feature disabled)
  | "rate_limited" // too many attempts
  | "internal"; // unexpected
```

```ts
class DomainError extends Error {
  code: DomainErrorCode;
  details?: Record<string, unknown>; // safe-to-expose, e.g. field errors — never secrets
}
```

Named subclasses (IMPLEMENTED): `UnauthenticatedError`, `ForbiddenError`,
`NotFoundError`, `ValidationError` (carries `details`), `ConflictError`.
`isDomainError(value)` guards it. `precondition_failed`, `rate_limited`,
`internal` are used via `new DomainError({ code, message })` until a subclass
earns its place.

## Which error when

| Situation                                                                                                  | Error                                                                            |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `ctx.userId` is null on an auth-required op                                                                | `UnauthenticatedError`                                                           |
| caller authenticated but lacks the permission                                                              | `ForbiddenError`                                                                 |
| memorial / tribute / event id doesn't resolve for this caller                                              | `NotFoundError` (do **not** leak existence of a private memorial — 404, not 403) |
| Zod parse fails / bad slug / message too long                                                              | `ValidationError` with `details`                                                 |
| publish an already-published memorial; approve an already-approved tribute; change slug to the current one | `ConflictError`                                                                  |
| submit a tribute when `tributes_enabled` is false; publish a funeral event on a suspended memorial         | `precondition_failed`                                                            |
| Nth anonymous submission within the window                                                                 | `rate_limited`                                                                   |
| repository/DB failure, invariant violated                                                                  | `internal` (log, don't leak)                                                     |

## Transport mapping (reference — not authoritative HTTP contract)

| Code                  | HTTP      | Server Action                      |
| --------------------- | --------- | ---------------------------------- |
| `unauthenticated`     | 401       | redirect to sign-in                |
| `forbidden`           | 403       | inline "you don't have permission" |
| `not_found`           | 404       | 404 page                           |
| `validation`          | 422       | field errors from `details`        |
| `conflict`            | 409       | inline conflict message            |
| `precondition_failed` | 409 / 422 | inline                             |
| `rate_limited`        | 429       | "please wait and try again"        |
| `internal`            | 500       | generic error toast + logged       |

## Rules

- **Never** put a secret, token, email, IP, or raw DB error text in `message`
  or `details`.
- A private memorial that the caller may not see returns `not_found`, not
  `forbidden` — existence is not disclosed.
- The database (RLS, constraints, guards) is the backstop: if a domain check is
  ever bypassed, the write still fails with a Postgres error the domain maps to
  `internal` or `forbidden` — it never silently succeeds.
