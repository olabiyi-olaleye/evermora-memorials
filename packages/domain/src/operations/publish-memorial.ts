import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { roleHasPermission } from "../authorization/permissions";
import { isAuthenticated, type CallerContext } from "../context";
import {
  DomainError,
  ForbiddenError,
  MemorialAlreadyPublishedError,
  MemorialInvalidStateError,
  MemorialNotFoundError,
  PreconditionFailedError,
  UnauthenticatedError,
  ValidationError,
} from "../errors";
import type { OperationDeps } from "./deps";

/**
 * publishMemorial — contract: `docs/domain/operations/publish-memorial.md`.
 *
 * Moves a `draft` memorial to `published` and stamps `published_at`, making the
 * public address live.
 *
 * Does NOT require a full biography, gallery, funeral information, a service
 * provider, a programme, or payment. Fast publication is a core principle.
 * Funeral planning status is independent — a memorial may be
 * `published` while planning is `not_started` / `planning`.
 *
 * Minimum-to-publish (Phase 5E): `full_name` is present (always — NOT NULL), a
 * canonical slug exists (guaranteed by createMemorial), and there is at least
 * one **published story section** OR a portrait. This is the documented
 * "name + (portrait or published story)" bar — still light: one short section
 * is enough, and no biography, gallery, funeral info or payment is required.
 * (Portrait wiring arrives with the media phase; until then the story section
 * is the practical route.)
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
});

export type PublishMemorialInput = z.input<typeof InputSchema>;

export interface PublishMemorialResult {
  memorialId: MemorialId;
  status: "published";
  canonicalSlug: string;
  publishedAt: string;
}

export async function publishMemorial(params: {
  caller: CallerContext;
  input: PublishMemorialInput;
  deps: OperationDeps;
}): Promise<PublishMemorialResult> {
  const { caller, deps } = params;

  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to publish a memorial.");
  }

  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("Invalid publish request.", { reason: "invalid_input" });
  }
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    // Load — RLS means a private memorial the caller cannot see reads as null.
    const memorial = await repos.memorials.findById(memorialId);
    if (!memorial || memorial.deletedAt) {
      throw new MemorialNotFoundError();
    }

    // Authorization: needs `memorial.edit` (owner / admin / content_editor) or platform admin.
    const role = await repos.memberships.activeRole(memorialId, caller.userId);
    const allowed = caller.isPlatformAdmin || roleHasPermission(role, "memorial.edit");
    if (!allowed) {
      throw new ForbiddenError("You do not have permission to publish this memorial.");
    }

    // Lifecycle
    switch (memorial.status) {
      case "published":
        throw new MemorialAlreadyPublishedError();
      case "draft":
        break;
      default:
        // archived / suspended / deleted
        throw new MemorialInvalidStateError(memorial.status, publishStateMessage(memorial.status));
    }

    // Minimum publishable identity
    if (memorial.fullName.trim().length === 0) {
      throw new PreconditionFailedError("A memorial needs a name before it can be published.", {
        reason: "missing_name",
      });
    }
    const canonical = await repos.slugs.canonicalFor(memorialId);
    if (!canonical) {
      throw new DomainError({
        code: "internal",
        message: "The memorial has no canonical address to publish.",
      });
    }

    // Minimum content: a portrait OR at least one published story section.
    const hasPortrait = Boolean(memorial.portraitMediaId);
    if (!hasPortrait) {
      const publishedStory = await repos.story.publishedCount(memorialId);
      if (publishedStory === 0) {
        throw new PreconditionFailedError(
          "Add a short piece about their life (or a portrait) before publishing.",
          { reason: "missing_minimum_content" },
        );
      }
    }

    // Privacy / indexing are untouched by publish — verify the separation holds.
    const privacy = await repos.settings.privacy(memorialId);
    const searchIndexingBefore = privacy?.searchIndexingEnabled ?? false;

    const publishedAt = deps.clock.now();
    const updated = await repos.memorials.markPublished(memorialId, publishedAt);

    const privacyAfter = await repos.settings.privacy(memorialId);
    if ((privacyAfter?.searchIndexingEnabled ?? false) !== searchIndexingBefore) {
      throw new DomainError({
        code: "internal",
        message: "Publishing a memorial must not change its search-indexing setting.",
      });
    }

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "memorial.published",
      entityType: "memorial",
      entityId: memorialId,
      memorialId,
      metadata: { canonicalSlug: canonical.slug },
    });
    deps.events.record("memorial.published", {
      memorialId,
      canonicalSlug: canonical.slug,
    });

    return {
      memorialId,
      status: "published" as const,
      canonicalSlug: canonical.slug,
      publishedAt: (updated.publishedAt ?? publishedAt.toISOString()) as string,
    };
  });
}

function publishStateMessage(status: string): string {
  if (status === "archived") return "Restore the memorial before publishing it again.";
  if (status === "suspended") return "This memorial has been suspended by Evermora.";
  return `A ${status} memorial cannot be published.`;
}
