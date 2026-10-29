import { z } from "zod";
import type { MemorialId, ProfileId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import {
  SlugInvalidError,
  SlugReservedError,
  SlugUnavailableError,
  UnauthenticatedError,
  ValidationError,
  DomainError,
} from "../errors";
import { isUniqueViolation } from "../ports/unit-of-work";
import { checkSlug } from "../validation/slug";
import type { OperationDeps } from "./deps";

/**
 * createMemorial — contract: `docs/domain/operations/create-memorial.md`.
 *
 * Creates a `draft` memorial owned by the signed-in caller, reserves its first
 * canonical slug, and records the creation. The DB triggers
 * (`memorials_grant_creator_owner`, `memorials_provision_settings`) create the
 * owner membership and the privacy/feature-settings rows inside the same
 * transaction.
 *
 * Does NOT require a portrait, story, gallery, funeral information, or payment.
 */

const InputSchema = z.object({
  fullName: z.string().trim().min(1, "A name is required.").max(200),
  preferredName: z.string().trim().max(200).optional(),
  headline: z.string().trim().max(500).optional(),
  dateOfBirth: z.string().date().optional(),
  dateOfDeath: z.string().date().optional(),
  birthPlace: z.string().trim().max(200).optional(),
  /** Optional; derived from `fullName` when omitted. */
  slug: z.string().trim().max(200).optional(),
});

export type CreateMemorialInput = z.input<typeof InputSchema>;

export interface CreateMemorialResult {
  memorialId: MemorialId;
  canonicalSlug: string;
  status: "draft";
}

export async function createMemorial(params: {
  caller: CallerContext;
  input: CreateMemorialInput;
  deps: OperationDeps;
}): Promise<CreateMemorialResult> {
  const { caller, deps } = params;

  // 1. Authentication
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to create a memorial.");
  }
  const ownerId: ProfileId = caller.userId;

  // 2. Input shape
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The memorial details are invalid.", fieldErrors(parsed.error));
  }
  const input = parsed.data;

  // 3. Business invariants (cross-field)
  if (input.dateOfBirth && input.dateOfDeath && input.dateOfDeath < input.dateOfBirth) {
    throw new ValidationError("The date of death cannot be before the date of birth.", {
      reason: "dates_out_of_order",
    });
  }

  // 4. Slug: derive → normalise → grammar
  const check = checkSlug(input.slug && input.slug.length > 0 ? input.slug : input.fullName);
  if (!check.ok) {
    throw new SlugInvalidError(
      check.normalized || (input.slug ?? input.fullName),
      slugMessage(check.rejection),
    );
  }
  const slug = check.normalized;

  const memorialId = deps.ids.newId();

  return deps.unitOfWork.transaction(caller, async (repos) => {
    // 5. Reserved-route check (advisory; the DB trigger also enforces it)
    if (await repos.slugs.isReserved(slug)) {
      throw new SlugReservedError(slug);
    }

    // 6. Create the memorial (triggers: owner membership + settings rows)
    const memorial = await repos.memorials.create({
      id: memorialId,
      createdBy: ownerId,
      fullName: input.fullName,
      preferredName: input.preferredName ?? null,
      headline: input.headline ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      dateOfDeath: input.dateOfDeath ?? null,
      birthPlace: input.birthPlace ?? null,
      status: "draft",
    });

    // 7. Defensive: the ownership + settings invariants the triggers guarantee
    const [ownerRole, privacy, feature] = await Promise.all([
      repos.memberships.activeRole(memorial.id, ownerId),
      repos.settings.privacy(memorial.id),
      repos.settings.feature(memorial.id),
    ]);
    if (ownerRole !== "owner" || !privacy || !feature) {
      throw new DomainError({
        code: "internal",
        message: "The memorial was created without its ownership or settings invariants.",
      });
    }
    if (privacy.searchIndexingEnabled) {
      // Safe-defaults guard — a new memorial is never search-indexed.
      throw new DomainError({
        code: "internal",
        message: "A new memorial must not be search-indexed by default.",
      });
    }

    // 8. First canonical slug
    let canonical;
    try {
      canonical = await repos.slugs.addCanonical({
        id: deps.ids.newId(),
        memorialId: memorial.id,
        slug,
        createdBy: ownerId,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new SlugUnavailableError(slug);
      throw err;
    }

    // 9. Audit + domain event
    await repos.audit.record({
      actorProfileId: ownerId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.created",
      entityType: "memorial",
      entityId: memorial.id,
      memorialId: memorial.id,
      metadata: { canonicalSlug: canonical.slug },
    });
    deps.events.record("memorial.created", {
      memorialId: memorial.id,
      canonicalSlug: canonical.slug,
    });

    return { memorialId: memorial.id, canonicalSlug: canonical.slug, status: "draft" as const };
  });
}

function fieldErrors(error: z.ZodError): Record<string, unknown> {
  return {
    reason: "invalid_input",
    fields: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

function slugMessage(rejection: ReturnType<typeof checkSlug>["rejection"]): string | undefined {
  switch (rejection) {
    case "too_short":
      return "The address is too short (minimum 3 characters).";
    case "too_long":
      return "The address is too long (maximum 63 characters).";
    case "pure_numeric":
      return "The address must contain at least one letter.";
    case "empty":
      return "Enter a valid address.";
    default:
      return "The address may use lowercase letters, numbers and hyphens only.";
  }
}
