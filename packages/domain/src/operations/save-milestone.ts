import { z } from "zod";
import { SECTION_VISIBILITY, type MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { Repositories } from "../ports/repositories";
import type { MilestoneRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * saveMilestone — create or update one timeline milestone. `story.edit`.
 * A milestone is a year (optionally a full date), a short title, and an
 * optional note. When a full date is given, `year` is derived from it.
 */

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    id: z.string().uuid().optional(),
    year: z.number().int().min(1).max(9999).optional(),
    onDate: z.string().date().nullable().optional(),
    title: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "A title is required.").max(200)),
    description: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(1000))
      .transform((s) => (s.length === 0 ? null : s))
      .nullable()
      .optional(),
    visibility: z.enum(SECTION_VISIBILITY).default("inherit"),
    status: z.enum(["draft", "published"]).default("published"),
  })
  .refine((v) => v.year !== undefined || (v.onDate !== undefined && v.onDate !== null), {
    message: "A year or a date is required.",
    path: ["year"],
  });

export type SaveMilestoneInput = z.input<typeof InputSchema>;

export interface SaveMilestoneResult {
  milestone: MilestoneRow;
  created: boolean;
}

export async function saveMilestone(params: {
  caller: CallerContext;
  input: SaveMilestoneInput;
  deps: OperationDeps;
}): Promise<SaveMilestoneResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to edit the timeline.");
  }

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The milestone is invalid.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;
  const memorialId = input.memorialId as MemorialId;

  const onDate = input.onDate ?? null;
  const year = onDate ? Number(onDate.slice(0, 4)) : input.year!;
  if (input.year !== undefined && onDate && Number(onDate.slice(0, 4)) !== input.year) {
    throw new ValidationError("The year and the date don't match.", {
      reason: "year_date_mismatch",
    });
  }

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "story.edit");

    if (input.id) {
      const existing = await repos.milestones.findById(input.id);
      if (!existing || existing.memorialId !== memorialId) {
        throw new NotFoundError("That milestone does not exist.");
      }
      const milestone = await repos.milestones.update(input.id, {
        year,
        onDate,
        title: input.title,
        description: input.description ?? null,
        visibility: input.visibility,
        status: input.status,
      });
      await audit(repos, caller, memorialId, milestone.id, "milestone.updated");
      return { milestone, created: false };
    }

    const siblings = await repos.milestones.listForMemorial(memorialId);
    const nextOrder = siblings.reduce((max, m) => Math.max(max, m.displayOrder + 1), 0);
    const milestone = await repos.milestones.create({
      id: deps.ids.newId(),
      memorialId,
      year,
      onDate,
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility,
      status: input.status,
      displayOrder: nextOrder,
    });
    await audit(repos, caller, memorialId, milestone.id, "milestone.created");
    return { milestone, created: true };
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
    entityType: "milestone",
    entityId,
    memorialId,
  });
}
