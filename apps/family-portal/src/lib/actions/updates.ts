"use server";

import { revalidatePath } from "next/cache";
import {
  archiveFamilyUpdate,
  publishFamilyUpdate,
  removeFamilyUpdate,
  saveFamilyUpdate,
  type FamilyUpdateLifecycleInput,
  type RemoveFamilyUpdateInput,
  type SaveFamilyUpdateInput,
} from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

/**
 * Server Action adapters for the Phase 5I family-update operations.
 * authenticate → CallerContext → domain op → revalidate the memorial's pages.
 */

function revalidate(memorialId: string) {
  revalidatePath("/");
  revalidatePath(`/memorials/${memorialId}`, "layout");
}

export async function saveFamilyUpdateAction(
  input: SaveFamilyUpdateInput,
): Promise<ActionResult<{ id: string; created: boolean }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/updates`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => saveFamilyUpdate({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? { ok: true, data: { id: result.data.update.id, created: result.data.created } }
    : result;
}

export async function publishFamilyUpdateAction(
  input: FamilyUpdateLifecycleInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/updates`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => publishFamilyUpdate({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

export async function archiveFamilyUpdateAction(
  input: FamilyUpdateLifecycleInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/updates`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => archiveFamilyUpdate({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

export async function removeFamilyUpdateAction(
  input: RemoveFamilyUpdateInput,
): Promise<ActionResult<{ removed: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/updates`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => removeFamilyUpdate({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}
