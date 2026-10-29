import { z } from "zod";
import { MEMORIAL_VISIBILITY, type MemorialId } from "@evermora/types";
import { roleHasPermission } from "../authorization/permissions";
import { isAuthenticated, type CallerContext } from "../context";
import {
  DomainError,
  ForbiddenError,
  MemorialInvalidStateError,
  MemorialNotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { MemorialVisibility } from "@evermora/types";
import type { PrivacySettingsPatch } from "../ports/rows";
import type { OperationDeps } from "./deps";

// Grammar mirrors the `memorial_visibility` enum in the database.

/**
 * updateMemorialPrivacy — contract: `docs/domain/operations/update-memorial-privacy.md`.
 *
 * Sets the memorial-level visibility (`public` / `anyone_with_link` /
 * `private`) and the SEPARATE search-engine indexing toggle. Requires
 * `privacy.manage` (owner / admin) or a platform admin.
 *
 * Search indexing is independent of visibility — a `public` memorial is not
 * automatically indexable. Making a memorial non-public also forces indexing
 * off (an unlisted/private page must never stay in a search index).
 *
 * Section-level visibility is a later phase and is not touched here.
 */

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    visibility: z.enum(MEMORIAL_VISIBILITY).optional(),
    searchIndexingEnabled: z.boolean().optional(),
  })
  .strict();

export type UpdateMemorialPrivacyInput = z.input<typeof InputSchema>;

export interface UpdateMemorialPrivacyResult {
  memorialId: MemorialId;
  visibility: MemorialVisibility;
  searchIndexingEnabled: boolean;
}

export async function updateMemorialPrivacy(params: {
  caller: CallerContext;
  input: UpdateMemorialPrivacyInput;
  deps: OperationDeps;
}): Promise<UpdateMemorialPrivacyResult> {
  const { caller, deps } = params;

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to change privacy settings.");
  }

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The privacy settings are invalid.", { reason: "invalid_input" });
  }
  const { memorialId: rawId, visibility, searchIndexingEnabled } = parsed.data;
  const memorialId = rawId as MemorialId;

  if (visibility === undefined && searchIndexingEnabled === undefined) {
    throw new ValidationError("There are no changes to save.", { reason: "empty_patch" });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) {
      throw new MemorialNotFoundError();
    }

    const role = await repos.memberships.activeRole(memorialId, caller.userId);
    const allowed = caller.isPlatformAdmin || roleHasPermission(role, "privacy.manage");
    if (!allowed) {
      throw new ForbiddenError("You do not have permission to change this memorial's privacy.");
    }

    if (memorial.status === "suspended") {
      throw new MemorialInvalidStateError(
        "suspended",
        "This memorial has been suspended by Evermora.",
      );
    }

    const current = await repos.settings.privacy(memorialId);
    if (!current) {
      throw new DomainError({
        code: "internal",
        message: "The memorial has no privacy settings row.",
      });
    }

    const nextVisibility = visibility ?? current.visibility;
    // An unlisted or private memorial must never remain search-indexed.
    const nextIndexing =
      nextVisibility === "public"
        ? (searchIndexingEnabled ?? current.searchIndexingEnabled)
        : false;

    const patch: PrivacySettingsPatch = {};
    if (nextVisibility !== current.visibility) patch.visibility = nextVisibility;
    if (nextIndexing !== current.searchIndexingEnabled) patch.searchIndexingEnabled = nextIndexing;

    if (Object.keys(patch).length === 0) {
      return {
        memorialId,
        visibility: current.visibility,
        searchIndexingEnabled: current.searchIndexingEnabled,
      } satisfies UpdateMemorialPrivacyResult;
    }

    const updated = await repos.settings.updatePrivacy(memorialId, patch);

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.privacy_changed",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: {
        visibility: updated.visibility,
        searchIndexingEnabled: updated.searchIndexingEnabled,
      },
    });

    return {
      memorialId,
      visibility: updated.visibility,
      searchIndexingEnabled: updated.searchIndexingEnabled,
    } satisfies UpdateMemorialPrivacyResult;
  });
}
