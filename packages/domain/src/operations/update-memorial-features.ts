import { z } from "zod";
import type { MemorialId } from "@evermora/types";
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
import type { FeatureSettingsPatch, FeatureSettingsRow } from "../ports/rows";
import type { OperationDeps } from "./deps";

/**
 * updateMemorialFeatures — contract: `docs/domain/operations/update-memorial-features.md`.
 *
 * Toggles the product capabilities a memorial exposes (tributes, tribute
 * moderation, photo contributions, candles, funeral section, family updates,
 * sharing). Requires `memorial.edit` (owner / admin / content_editor) or a
 * platform admin — mirrors the `feature_settings_update` RLS policy.
 *
 * This is a fixed set of toggles, not a generic flag engine. Only the MVP
 * subset is editable here; `guestbook_enabled`, `qr_code_enabled` and
 * `visitor_analytics_enabled` are managed elsewhere.
 */

const EDITABLE_KEYS = [
  "tributesEnabled",
  "tributeModerationEnabled",
  "photoContributionsEnabled",
  "candlesEnabled",
  "funeralEnabled",
  "updatesEnabled",
  "sharingEnabled",
] as const;

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    tributesEnabled: z.boolean().optional(),
    tributeModerationEnabled: z.boolean().optional(),
    photoContributionsEnabled: z.boolean().optional(),
    candlesEnabled: z.boolean().optional(),
    funeralEnabled: z.boolean().optional(),
    updatesEnabled: z.boolean().optional(),
    sharingEnabled: z.boolean().optional(),
  })
  .strict();

export type UpdateMemorialFeaturesInput = z.input<typeof InputSchema>;

export type UpdateMemorialFeaturesResult = FeatureSettingsRow;

export async function updateMemorialFeatures(params: {
  caller: CallerContext;
  input: UpdateMemorialFeaturesInput;
  deps: OperationDeps;
}): Promise<UpdateMemorialFeaturesResult> {
  const { caller, deps } = params;

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to change memorial settings.");
  }

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The memorial settings are invalid.", { reason: "invalid_input" });
  }
  const { memorialId: rawId, ...fields } = parsed.data;
  const memorialId = rawId as MemorialId;

  const requested: FeatureSettingsPatch = {};
  for (const key of EDITABLE_KEYS) {
    if (fields[key] !== undefined) requested[key] = fields[key];
  }
  if (Object.keys(requested).length === 0) {
    throw new ValidationError("There are no changes to save.", { reason: "empty_patch" });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) {
      throw new MemorialNotFoundError();
    }

    const role = await repos.memberships.activeRole(memorialId, caller.userId);
    const allowed = caller.isPlatformAdmin || roleHasPermission(role, "memorial.edit");
    if (!allowed) {
      throw new ForbiddenError("You do not have permission to change this memorial's settings.");
    }

    if (memorial.status === "suspended") {
      throw new MemorialInvalidStateError(
        "suspended",
        "This memorial has been suspended by Evermora.",
      );
    }

    const current = await repos.settings.feature(memorialId);
    if (!current) {
      throw new DomainError({
        code: "internal",
        message: "The memorial has no feature settings row.",
      });
    }

    // Only write keys that actually change.
    const patch: FeatureSettingsPatch = {};
    for (const key of EDITABLE_KEYS) {
      const v = requested[key];
      if (v !== undefined && v !== current[key]) patch[key] = v;
    }
    if (Object.keys(patch).length === 0) return { ...current };

    const updated = await repos.settings.updateFeature(memorialId, patch);

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.features_changed",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { changed: Object.keys(patch) },
    });

    return updated;
  });
}
