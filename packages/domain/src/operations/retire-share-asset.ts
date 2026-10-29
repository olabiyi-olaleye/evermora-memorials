import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * retireShareAsset — mark one share resolver inactive (`is_active = false`,
 * `retired_at`). The row is **kept** so a printed card in the world still
 * resolves — to a gentle "this memorial has moved / been archived" notice
 * rather than a broken link. `memorial.edit`.
 */

const InputSchema = z.object({
  memorialId: z.string().uuid(),
  shareResolverId: z.string().uuid(),
});

export type RetireShareAssetInput = z.input<typeof InputSchema>;

export async function retireShareAsset(params: {
  caller: CallerContext;
  input: RetireShareAssetInput;
  deps: OperationDeps;
}): Promise<{ retired: true }> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage share codes.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "memorial.edit", {
      allowArchived: true,
    });
    const resolver = await repos.shareResolvers.findById(parsed.data.shareResolverId);
    if (!resolver || resolver.memorialId !== memorialId) {
      throw new NotFoundError("That share code does not exist.");
    }
    if (resolver.isActive) {
      await repos.shareResolvers.retire(resolver.id);
      await repos.audit.record({
        actorProfileId: caller.userId,
        actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
        action: "share_asset.retired",
        entityType: "share_resolver",
        entityId: resolver.id,
        memorialId,
      });
    }
    return { retired: true };
  });
}
