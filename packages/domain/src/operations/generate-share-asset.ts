import { z } from "zod";
import type { MemorialId } from "@evermora/types";
import { sanitizeLine } from "@evermora/utils";
import { isAuthenticated, type CallerContext } from "../context";
import { PreconditionFailedError, UnauthenticatedError, ValidationError } from "../errors";
import type { ShareResolverRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * generateShareAsset — contract: `docs/domain/operations/generate-share-asset.md`.
 *
 * Mint a **permanent** share/QR identifier (`share_resolvers` row) for a
 * memorial. The token is unguessable and independent of the slug — a printed QR
 * keeps working forever. `memorial.edit`. Each call is a new token (a print
 * run); retire an old one with `retireShareAsset`.
 *
 * QR image generation is a transport concern (`@evermora/utils` `qrSvg`) — the
 * domain returns the resolver row and the caller composes the URL + image.
 */

const MEDIA = [
  "funeral_programme",
  "memorial_card",
  "banner",
  "reception_table",
  "keepsake",
  "other",
] as const;

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    label: z
      .string()
      .transform((s) => sanitizeLine(s))
      .pipe(z.string().max(120))
      .transform((s) => (s.length === 0 ? null : s))
      .nullable()
      .optional(),
    medium: z.enum(MEDIA).default("other"),
  })
  .strict();

export type GenerateShareAssetInput = z.input<typeof InputSchema>;

export interface GenerateShareAssetResult {
  shareResolver: ShareResolverRow;
}

export async function generateShareAsset(params: {
  caller: CallerContext;
  input: GenerateShareAssetInput;
  deps: OperationDeps;
}): Promise<GenerateShareAssetResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to create a share code.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) throw new ValidationError("Invalid request.", { reason: "invalid_input" });
  const memorialId = parsed.data.memorialId as MemorialId;

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "memorial.edit");

    const settings = await repos.settings.feature(memorialId);
    if (settings && !settings.qrCodeEnabled) {
      throw new PreconditionFailedError("QR codes are turned off for this memorial.", {
        reason: "qr_disabled",
      });
    }

    const shareResolver = await repos.shareResolvers.create({
      id: deps.ids.newId(),
      memorialId,
      label: parsed.data.label ?? null,
      medium: parsed.data.medium,
      createdBy: caller.userId,
    });

    await repos.audit.record({
      actorProfileId: caller.userId,
      actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
      action: "share_asset.generated",
      entityType: "share_resolver",
      entityId: shareResolver.id,
      memorialId,
      metadata: { medium: shareResolver.medium },
    });
    deps.events.record("share_asset.generated", {
      memorialId,
      shareResolverId: shareResolver.id,
      medium: shareResolver.medium,
    });

    return { shareResolver };
  });
}
