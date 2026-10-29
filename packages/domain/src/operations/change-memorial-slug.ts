import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { roleHasPermission } from "../authorization/permissions";
import { isAuthenticated, type CallerContext } from "../context";
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  MemorialNotFoundError,
  SlugInvalidError,
  SlugReservedError,
  SlugUnavailableError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import { isUniqueViolation } from "../ports/unit-of-work";
import { checkSlug } from "../validation/slug";
import type { OperationDeps } from "./deps";

/**
 * changeMemorialSlug — contract: `docs/domain/operations/change-memorial-slug.md`.
 *
 * Changes the visible public address without changing the memorial's identity
 * (its immutable `id`) and without breaking existing links:
 *
 *   memorial id → old canonical slug → retired alias (301) → new canonical slug
 *
 * Exactly one canonical slug per memorial at all times. Historical aliases are
 * retired, never deleted or recycled.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  newSlug: z.string().trim().min(1).max(200),
});

export type ChangeMemorialSlugInput = z.input<typeof InputSchema>;

export interface ChangeMemorialSlugResult {
  memorialId: MemorialId;
  canonicalSlug: string;
  previousCanonicalSlug: string;
  wasExistingAlias: boolean;
}

export async function changeMemorialSlug(params: {
  caller: CallerContext;
  input: ChangeMemorialSlugInput;
  deps: OperationDeps;
}): Promise<ChangeMemorialSlugResult> {
  const { caller, deps } = params;

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to change a memorial address.");
  }

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("Invalid address change request.", { reason: "invalid_input" });
  }
  const memorialId = parsed.data.memorialId as MemorialId;

  const check = checkSlug(parsed.data.newSlug);
  if (!check.ok) {
    throw new SlugInvalidError(check.normalized || parsed.data.newSlug);
  }
  const newSlug = check.normalized;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) {
      throw new MemorialNotFoundError();
    }

    const role = await repos.memberships.activeRole(memorialId, caller.userId);
    const allowed = caller.isPlatformAdmin || roleHasPermission(role, "memorial.edit");
    if (!allowed) {
      throw new ForbiddenError("You do not have permission to change this memorial's address.");
    }

    if (await repos.slugs.isReserved(newSlug)) {
      throw new SlugReservedError(newSlug);
    }

    const current = await repos.slugs.canonicalFor(memorialId);
    if (!current) {
      throw new DomainError({
        code: "internal",
        message: "The memorial has no canonical address.",
      });
    }
    if (current.slug === newSlug) {
      throw new ConflictError("That is already this memorial's address.", { reason: "no_change" });
    }

    // Is the target slug already owned by *any* memorial?
    const existing = await repos.slugs.findBySlug(newSlug);
    let wasExistingAlias = false;

    if (existing && existing.memorialId !== memorialId) {
      throw new SlugUnavailableError(newSlug);
    }

    // Retire the current canonical → alias.
    const retiredAt = deps.clock.now();
    await repos.slugs.retireCanonical(memorialId, retiredAt);

    let promoted;
    if (existing && existing.memorialId === memorialId) {
      // Re-promote an existing (retired) alias of this memorial.
      wasExistingAlias = true;
      promoted = await repos.slugs.promoteExistingToCanonical(existing.id);
    } else {
      try {
        promoted = await repos.slugs.addCanonical({
          id: deps.ids.newId(),
          memorialId,
          slug: newSlug,
          createdBy: caller.userId,
        });
      } catch (err) {
        if (isUniqueViolation(err)) throw new SlugUnavailableError(newSlug);
        throw err;
      }
    }

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.slug_changed",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { from: current.slug, to: promoted.slug, wasExistingAlias },
    });
    deps.events.record("memorial.slug_changed", {
      memorialId,
      from: current.slug,
      to: promoted.slug,
    });

    return {
      memorialId,
      canonicalSlug: promoted.slug,
      previousCanonicalSlug: current.slug,
      wasExistingAlias,
    };
  });
}
