"use server";

import { revalidatePath } from "next/cache";
import {
  generateShareAsset,
  retireShareAsset,
  type GenerateShareAssetInput,
  type RetireShareAssetInput,
} from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

/** Server Action adapters for the Phase 5J share-asset operations. */

function revalidate(memorialId: string) {
  revalidatePath(`/memorials/${memorialId}/share`);
}

export async function generateShareAssetAction(
  input: GenerateShareAssetInput,
): Promise<ActionResult<{ id: string; token: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/share`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => generateShareAsset({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? {
        ok: true,
        data: { id: result.data.shareResolver.id, token: result.data.shareResolver.token },
      }
    : result;
}

export async function retireShareAssetAction(
  input: RetireShareAssetInput,
): Promise<ActionResult<{ retired: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/share`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => retireShareAsset({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}
