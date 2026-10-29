"use server";

import { revalidatePath } from "next/cache";
import {
  removeMilestone,
  removeStorySection,
  reorderMilestones,
  reorderStorySections,
  saveMilestone,
  saveStorySection,
  type RemoveMilestoneInput,
  type RemoveStorySectionInput,
  type ReorderMilestonesInput,
  type ReorderStorySectionsInput,
  type SaveMilestoneInput,
  type SaveStorySectionInput,
} from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

/**
 * Server Action adapters for the Phase 5E story + milestone operations.
 * authenticate → CallerContext → domain op → revalidate the memorial's pages.
 */

function revalidate(memorialId: string) {
  revalidatePath("/");
  revalidatePath(`/memorials/${memorialId}`, "layout");
}

export async function saveStorySectionAction(
  input: SaveStorySectionInput,
): Promise<ActionResult<{ id: string; created: boolean }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/story`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => saveStorySection({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? { ok: true, data: { id: result.data.section.id, created: result.data.created } }
    : result;
}

export async function removeStorySectionAction(
  input: RemoveStorySectionInput,
): Promise<ActionResult<{ removed: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/story`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => removeStorySection({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}

export async function reorderStorySectionsAction(
  input: ReorderStorySectionsInput,
): Promise<ActionResult<{ ordered: number }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/story`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => reorderStorySections({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}

export async function saveMilestoneAction(
  input: SaveMilestoneInput,
): Promise<ActionResult<{ id: string; created: boolean }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/story`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => saveMilestone({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? { ok: true, data: { id: result.data.milestone.id, created: result.data.created } }
    : result;
}

export async function removeMilestoneAction(
  input: RemoveMilestoneInput,
): Promise<ActionResult<{ removed: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/story`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => removeMilestone({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}

export async function reorderMilestonesAction(
  input: ReorderMilestonesInput,
): Promise<ActionResult<{ ordered: number }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/story`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => reorderMilestones({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}
