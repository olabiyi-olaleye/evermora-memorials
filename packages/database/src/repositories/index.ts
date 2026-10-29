/**
 * The repository *ports* now live in `@evermora/domain` (the consumer defines
 * what it needs). This module re-exports them for convenience and exposes the
 * concrete factory that builds them against a Drizzle transaction.
 *
 * See `@evermora/database/persistence` and `docs/domain/repositories.md`.
 */

export type {
  Repositories,
  MemorialRepository,
  MembershipRepository,
  MemorialSlugRepository,
  SettingsRepository,
  AuditRepository,
  UnitOfWork,
  MemorialRow,
  MemorialSlugRow,
  NewMemorial,
  AuditEntry,
} from "@evermora/domain";

export { createUnitOfWork, buildRepositories } from "../persistence/index";
