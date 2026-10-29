import { z } from "zod";
import { MEMORIAL_GENDER, type MemorialId } from "@evermora/types";
import { roleHasPermission } from "../authorization/permissions";
import { isAuthenticated, type CallerContext } from "../context";
import {
  ForbiddenError,
  MemorialInvalidStateError,
  MemorialNotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { MemorialProfilePatch } from "../ports/rows";
import type { OperationDeps } from "./deps";

/**
 * updateMemorialProfile — contract: `docs/domain/operations/update-memorial-profile.md`.
 *
 * Edits the descriptive "who they were" fields of a memorial (name, preferred
 * name, headline, survived-by line, gender, short biography, dates (the birth
 * date may be year-only), birth
 * place, resting place). Works on
 * a `draft` or `published` memorial; a family member with `memorial.edit`
 * (owner / admin / content_editor) or a platform admin may do it.
 *
 * It does NOT touch lifecycle, slug, privacy, or feature settings — those have
 * their own operations.
 */

const trimmedOptional = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max))
    // "" from a cleared form field means "clear this value".
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional();

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    fullName: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "A name is required.").max(200))
      .optional(),
    preferredName: trimmedOptional(200),
    headline: trimmedOptional(500),
    survivedBy: trimmedOptional(500),
    gender: z.enum(MEMORIAL_GENDER).nullable().optional(),
    biographySummary: trimmedOptional(2000),
    dateOfBirth: z.string().date().nullable().optional(),
    birthYearOnly: z.boolean().optional(),
    dateOfDeath: z.string().date().nullable().optional(),
    birthPlace: trimmedOptional(200),
    restingPlace: trimmedOptional(200),
  })
  .strict();

export type UpdateMemorialProfileInput = z.input<typeof InputSchema>;

export interface UpdateMemorialProfileResult {
  memorialId: MemorialId;
  fullName: string;
  updatedAt: string;
}

const PROFILE_KEYS = [
  "fullName",
  "preferredName",
  "headline",
  "survivedBy",
  "gender",
  "biographySummary",
  "dateOfBirth",
  "birthYearOnly",
  "dateOfDeath",
  "birthPlace",
  "restingPlace",
] as const;

export async function updateMemorialProfile(params: {
  caller: CallerContext;
  input: UpdateMemorialProfileInput;
  deps: OperationDeps;
}): Promise<UpdateMemorialProfileResult> {
  const { caller, deps } = params;

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to edit a memorial.");
  }

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The memorial details are invalid.", fieldErrors(parsed.error));
  }
  const { memorialId: rawId, ...fields } = parsed.data;
  const memorialId = rawId as MemorialId;

  const patch: MemorialProfilePatch = {};
  for (const key of PROFILE_KEYS) {
    if (key in fields && fields[key] !== undefined) {
      (patch as Record<string, unknown>)[key] = fields[key];
    }
  }
  if (Object.keys(patch).length === 0) {
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
      throw new ForbiddenError("You do not have permission to edit this memorial.");
    }

    if (memorial.status === "suspended") {
      throw new MemorialInvalidStateError(
        "suspended",
        "This memorial has been suspended by Evermora.",
      );
    }
    if (memorial.status === "archived") {
      throw new MemorialInvalidStateError("archived", "Restore the memorial before editing it.");
    }

    // Cross-field: date of death cannot precede date of birth (after merge).
    const nextBirth = "dateOfBirth" in patch ? (patch.dateOfBirth ?? null) : memorial.dateOfBirth;
    const nextDeath = "dateOfDeath" in patch ? (patch.dateOfDeath ?? null) : memorial.dateOfDeath;
    if (nextBirth && nextDeath && nextDeath < nextBirth) {
      throw new ValidationError("The date of death cannot be before the date of birth.", {
        reason: "dates_out_of_order",
      });
    }

    // Year-only birth: store YYYY-01-01 so the date column stays a real date;
    // with no birth date at all the flag is meaningless and is cleared.
    const nextYearOnly = patch.birthYearOnly ?? memorial.birthYearOnly;
    if (!nextBirth) {
      if (nextYearOnly) patch.birthYearOnly = false;
    } else if (nextYearOnly && !nextBirth.endsWith("-01-01")) {
      patch.dateOfBirth = `${nextBirth.slice(0, 4)}-01-01`;
    }

    const updated = await repos.memorials.updateProfile(memorialId, patch);

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.profile_updated",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { fields: Object.keys(patch) },
    });

    return {
      memorialId,
      fullName: updated.fullName,
      updatedAt: updated.updatedAt,
    } satisfies UpdateMemorialProfileResult;
  });
}

function fieldErrors(error: z.ZodError): Record<string, unknown> {
  return {
    reason: "invalid_input",
    fields: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}
