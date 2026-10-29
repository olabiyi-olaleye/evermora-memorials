import { z } from "zod";
import { SECTION_VISIBILITY, STORY_SECTION_KIND, type MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { StorySectionRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * saveStorySection — contract: `docs/domain/operations/save-story-section.md`.
 *
 * Create (no `id`) or update (`id` present) one story section. `story.edit`
 * (owner / admin / content_editor) or platform admin. A new section is appended
 * after the current highest `displayOrder`. Publishing a section is just
 * `status: "published"` — no separate operation.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  id: z.string().uuid().optional(),
  kind: z.enum(STORY_SECTION_KIND).default("custom"),
  title: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "A heading is required.").max(200)),
  body: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Write something before saving.").max(20_000)),
  visibility: z.enum(SECTION_VISIBILITY).default("inherit"),
  status: z.enum(["draft", "published"]).default("draft"),
});

export type SaveStorySectionInput = z.input<typeof InputSchema>;

export interface SaveStorySectionResult {
  section: StorySectionRow;
  created: boolean;
}

export async function saveStorySection(params: {
  caller: CallerContext;
  input: SaveStorySectionInput;
  deps: OperationDeps;
}): Promise<SaveStorySectionResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to edit the story.");
  }

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The story section is invalid.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const input = parsed.data;
  const memorialId = input.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "story.edit");

    if (input.id) {
      const existing = await repos.story.findById(input.id);
      if (!existing || existing.memorialId !== memorialId) {
        throw new NotFoundError("That story section does not exist.");
      }
      const section = await repos.story.update(input.id, {
        kind: input.kind,
        title: input.title,
        body: input.body,
        visibility: input.visibility,
        status: input.status,
      });
      await repos.audit.record({
        actorProfileId: caller.userId,
        actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
        action: "story_section.updated",
        entityType: "story_section",
        entityId: section.id,
        memorialId,
        metadata: { status: section.status },
      });
      return { section, created: false };
    }

    const siblings = await repos.story.listForMemorial(memorialId);
    const nextOrder = siblings.reduce((max, s) => Math.max(max, s.displayOrder + 1), 0);
    const section = await repos.story.create({
      id: deps.ids.newId(),
      memorialId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      visibility: input.visibility,
      status: input.status,
      displayOrder: nextOrder,
    });
    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "story_section.created",
      entityType: "story_section",
      entityId: section.id,
      memorialId,
      metadata: { status: section.status },
    });
    return { section, created: true };
  });
}
