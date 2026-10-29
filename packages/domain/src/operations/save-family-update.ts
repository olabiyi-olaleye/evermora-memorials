import { z } from "zod";
import { SECTION_VISIBILITY, UPDATE_IMPORTANCE, type MemorialId } from "@evermora/types";
import { sanitizeLine, sanitizePlainText } from "@evermora/utils";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { Repositories } from "../ports/repositories";
import type { FamilyUpdatePatch, FamilyUpdateRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * saveFamilyUpdate — contract: `docs/domain/operations/save-family-update.md`.
 *
 * Create (no `id`) or update (`id`) one official family notice. `updates.publish`
 * (owner / admin / content_editor) or a platform admin. A new update starts as
 * `draft`; use `publishFamilyUpdate` to make it visible. Family updates are
 * **official notices, not a social feed** — one authoritative voice.
 */

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    id: z.string().uuid().optional(),
    title: z
      .string()
      .transform((s) => sanitizeLine(s))
      .pipe(z.string().min(1, "A title is required.").max(200)),
    body: z
      .string()
      .transform((s) => sanitizePlainText(s))
      .pipe(z.string().min(1, "Write the update.").max(20000)),
    importance: z.enum(UPDATE_IMPORTANCE).default("normal"),
    funeralEventId: z.string().uuid().nullable().optional(),
    visibility: z.enum(SECTION_VISIBILITY).default("inherit"),
  })
  .strict();

export type SaveFamilyUpdateInput = z.input<typeof InputSchema>;

export interface SaveFamilyUpdateResult {
  update: FamilyUpdateRow;
  created: boolean;
}

export async function saveFamilyUpdate(params: {
  caller: CallerContext;
  input: SaveFamilyUpdateInput;
  deps: OperationDeps;
}): Promise<SaveFamilyUpdateResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to post a family update.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The family update is invalid.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { memorialId: rawId, id, funeralEventId, ...fields } = parsed.data;
  const memorialId = rawId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "updates.publish");

    if (funeralEventId) {
      const event = await repos.funeralEvents.findById(funeralEventId);
      if (!event || event.memorialId !== memorialId) {
        throw new ValidationError("That funeral event does not belong to this memorial.", {
          reason: "bad_funeral_event",
        });
      }
    }

    if (id) {
      const existing = await repos.familyUpdates.findById(id);
      if (!existing || existing.memorialId !== memorialId) {
        throw new NotFoundError("That family update does not exist.");
      }
      const patch: FamilyUpdatePatch = {
        title: fields.title,
        body: fields.body,
        importance: fields.importance,
        visibility: fields.visibility,
        funeralEventId: funeralEventId ?? null,
      };
      const update = await repos.familyUpdates.update(id, patch);
      await audit(repos, caller, memorialId, update.id, "family_update.updated");
      return { update, created: false };
    }

    const update = await repos.familyUpdates.create({
      id: deps.ids.newId(),
      memorialId,
      title: fields.title,
      body: fields.body,
      importance: fields.importance,
      authorProfileId: caller.userId,
      funeralEventId: funeralEventId ?? null,
      visibility: fields.visibility,
    });
    await audit(repos, caller, memorialId, update.id, "family_update.created");
    return { update, created: true };
  });
}

async function audit(
  repos: Repositories,
  caller: CallerContext,
  memorialId: MemorialId,
  entityId: string,
  action: string,
): Promise<void> {
  await repos.audit.record({
    actorProfileId: caller.userId,
    actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
    action,
    entityType: "family_update",
    entityId,
    memorialId,
  });
}
