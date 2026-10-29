# Domain documentation

Transport-independent documentation for the business layer implemented in
**`@evermora/domain`**. The executable code is the package; this explains how it
behaves and specifies operations not yet built.

> **Domain contracts are not HTTP contracts.** `publishMemorial()` is the
> business operation. A future `POST /api/memorials/:id/publish` would be **one**
> adapter around it — alongside a Server Action, a Route Handler, an internal
> service, a background worker, or a future mobile/partner API. Document the
> operation, never the endpoint. **`docs/api/` is not created** (architecture spec
> §37).

## Contents

| Document                                                             | Purpose                                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [domain-model.md](./domain-model.md)                                 | the layer's shape, `CallerContext`, entities it governs, principles     |
| [operations/README.md](./operations/README.md)                       | catalogue of the approved operations + the contract template            |
| [operations/](./operations/)                                         | one detailed contract per operation                                     |
| [errors.md](./errors.md)                                             | the `DomainError` taxonomy and how transports map it                    |
| [events.md](./events.md)                                             | domain events, notification events, audit events + emission rules       |
| [validation.md](./validation.md)                                     | validation principles (Zod at the edge, invariants in the domain)       |
| [transactions-and-idempotency.md](./transactions-and-idempotency.md) | transaction boundaries, idempotency expectations                        |
| [repositories.md](./repositories.md)                                 | the repository seam between `@evermora/domain` and `@evermora/database` |

## Implementation status

|                               |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Patterns (Phase 5A)**       | `CallerContext`, `DomainError` taxonomy, `DomainEventBuffer`, `Clock` / `IdGenerator` ports, the `roleHasPermission` matrix (mirrors `app.has_memorial_permission`), `checkSlug` grammar, the repository / `UnitOfWork` ports, and the Drizzle-backed adapter with **transaction-scoped RLS** — all **IMPLEMENTED**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Operations IMPLEMENTED**    | Phase 5A `createMemorial` · `publishMemorial` · `changeMemorialSlug`; 5C `updateMemorialProfile` · `updateMemorialPrivacy` · `updateMemorialFeatures`; 5E story + milestone ops; 5F album / media ops + `setMemorialPortrait`; 5G `submitTribute` · `approveTribute` · `rejectTribute` · `hideTribute` · `reportTribute`; 5H `saveFuneralEvent` · `publishFuneralEvent` · `cancelFuneralEvent` · `completeFuneralEvent` · `removeFuneralEvent` · `setFuneralPlanningStatus`; 5I `saveFamilyUpdate` · `publishFamilyUpdate` · `archiveFamilyUpdate` · `removeFamilyUpdate`; 5J `generateShareAsset` · `retireShareAsset`; 5K `inviteMemorialAdmin` · `changeMemorialRole` · `transferMemorialOwnership`; 5L `requestFuneralService`; 5M `setMemorialModeration` · `resolveReport` · `updateServiceRequest`; 5N `listMyNotifications` · `markNotificationsRead` (+ the `notifyMemorialMembers` / `notifyPlatformStaff` / `notifyByEmail` in-transaction recording helpers wired into 6 existing operations) — all with unit tests (in-memory) + integration tests (real local Postgres, RLS enforced). |
| **Operations SPECIFIED only** | only `reportMemorial` in [operations/](./operations/) — contract written, **no executable code**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

> **DOCUMENTED ≠ IMPLEMENTED.** A contract file is a specification. An operation
> only has executable business logic, validation, authorization, persistence and
> tests once its phase marks it IMPLEMENTED (see
> [operations/README.md](./operations/README.md)).

## Persistence & RLS (Phase 5A decision)

The repository / `UnitOfWork` **ports** live in `@evermora/domain/ports`; the
concrete Drizzle + `postgres-js` adapter lives in `@evermora/database`.
`UnitOfWork.transaction(caller, work)` opens one DB transaction and **establishes
the caller's RLS context** (`SET LOCAL ROLE authenticated|anon` +
`request.jwt.claims`) so every statement is subject to Row Level Security exactly
as a PostgREST request would be — the direct connection is a transport, **not** an
authorization bypass. See
[repositories.md](./repositories.md) and
[../architecture/supabase-environment.md](../architecture/supabase-environment.md).

## How the layer sits in the system

```
Server Action / Route Handler          ← builds CallerContext, parses input shape
        │
        ▼
@evermora/domain operation
        │  1. authenticate  (is there a caller? — else UnauthenticatedError)
        │  2. authorize     (does the caller hold the permission? — else ForbiddenError)
        │  3. validate      (Zod input + business invariants — else ValidationError)
        │  4. load          (repositories / supabase-js)
        │  5. check preconditions (state machine — else ConflictError/PreconditionFailed)
        │  6. write         (one transaction)
        │  7. record        (audit event + domain events + notification events, same tx)
        │  8. return        (a domain result — not a DB row, not an HTTP response)
        ▼
@evermora/database  →  Supabase Postgres (RLS is still the final boundary)
```

See [../architecture/authorization-architecture.md](../architecture/authorization-architecture.md)
and [../architecture/system-architecture.md](../architecture/system-architecture.md).
