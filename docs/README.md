# Evermora documentation

Three areas, one map. Start with whichever matches your question.

| I want to understand…                                              | Go to                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **what Evermora is, who it's for, how a screen or flow behaves**   | [product/](./product/) → [product/README.md](./product/README.md)                     |
| **how it's built** — system, data, security, deploy, experience    | [architecture/](./architecture/) → [architecture/README.md](./architecture/README.md) |
| **what a business operation does** — inputs, authz, events, errors | [domain/](./domain/) → [domain/README.md](./domain/README.md)                         |
| **the canonical, approved decisions**                              | [architecture/architecture-spec.md](./architecture/architecture-spec.md)    |

## Reading order for a new engineer

1. [product/prd.md](./product/prd.md) — the point of the thing.
2. [architecture/system-architecture.md](./architecture/system-architecture.md) — the shape.
3. [architecture/data-model.md](./architecture/data-model.md) +
   [architecture/authorization-architecture.md](./architecture/authorization-architecture.md) +
   [architecture/rls-architecture.md](./architecture/rls-architecture.md) — the spine.
4. [domain/domain-model.md](./domain/domain-model.md) +
   [domain/operations/README.md](./domain/operations/README.md) — how work gets done.
5. [product/screen-inventory.md](./product/screen-inventory.md) +
   [product/user-flows.md](./product/user-flows.md) — what to build.
6. [../README.md](../README.md) — how to run it.

## Reading order for a product designer

1. [product/prd.md](./product/prd.md) · [product/mvp-scope.md](./product/mvp-scope.md)
2. [product/information-architecture.md](./product/information-architecture.md)
3. [product/screen-inventory.md](./product/screen-inventory.md)
4. [product/flows/](./product/flows/) — one file per journey
5. [product/privacy-visibility-ux.md](./product/privacy-visibility-ux.md)
6. [architecture/design-system.md](./architecture/design-system.md) +
   [architecture/responsive-rules.md](./architecture/responsive-rules.md) +
   [architecture/accessibility-architecture.md](./architecture/accessibility-architecture.md)

## Conventions across the docs

- **Status legend**: **LOCKED** (approved decision) · **IMPLEMENTED** (in the
  repo now) · **DEFERRED / PLANNED** (approved direction, not built). Every doc
  is explicit about which.
- **No `docs/api/`.** HTTP endpoints, if any, are transport adapters documented
  beside the app — never the authoritative business contract.
- **Cross-links over duplication.** A fact lives in one place; other docs link
  to it.
- **The architecture spec wins** on decisions; a verified divergence from an older
  _structural_ statement is flagged in the file itself.
