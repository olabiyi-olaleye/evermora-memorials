"use server";

import { revalidatePath } from "next/cache";
import {
  changeMemorialSlug,
  createMemorial,
  publishMemorial,
  updateMemorialFeatures,
  updateMemorialPrivacy,
  updateMemorialProfile,
  type ChangeMemorialSlugInput,
  type CreateMemorialInput,
  type UpdateMemorialFeaturesInput,
  type UpdateMemorialPrivacyInput,
  type UpdateMemorialProfileInput,
} from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

/**
 * Thin Server Action adapters around the core-memorial domain operations.
 * Responsibility: authenticate (server session only) → build CallerContext →
 * parse input → call the operation → map result/error. No business rules here.
 */

export async function createMemorialAction(
  input: CreateMemorialInput,
): Promise<ActionResult<{ memorialId: string; canonicalSlug: string }>> {
  const user = await requireAuthUser("/memorials/new");
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => createMemorial({ caller, input, deps }));
  if (result.ok) revalidatePath("/");
  return result.ok
    ? {
        ok: true,
        data: { memorialId: result.data.memorialId, canonicalSlug: result.data.canonicalSlug },
      }
    : result;
}

export async function publishMemorialAction(
  memorialId: string,
): Promise<ActionResult<{ canonicalSlug: string; publishedAt: string }>> {
  const user = await requireAuthUser(`/memorials/${memorialId}`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) =>
    publishMemorial({ caller, input: { memorialId }, deps }),
  );
  if (result.ok) {
    revalidatePath("/");
    revalidatePath(`/memorials/${memorialId}`);
  }
  return result.ok
    ? {
        ok: true,
        data: { canonicalSlug: result.data.canonicalSlug, publishedAt: result.data.publishedAt },
      }
    : result;
}

export async function changeMemorialSlugAction(
  input: ChangeMemorialSlugInput,
): Promise<ActionResult<{ canonicalSlug: string; previousCanonicalSlug: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/settings`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => changeMemorialSlug({ caller, input, deps }));
  if (result.ok) {
    revalidatePath("/");
    revalidatePath(`/memorials/${input.memorialId}`);
  }
  return result.ok
    ? {
        ok: true,
        data: {
          canonicalSlug: result.data.canonicalSlug,
          previousCanonicalSlug: result.data.previousCanonicalSlug,
        },
      }
    : result;
}

function revalidateMemorial(memorialId: string): void {
  revalidatePath("/");
  revalidatePath(`/memorials/${memorialId}`, "layout");
}

export async function updateMemorialProfileAction(
  input: UpdateMemorialProfileInput,
): Promise<ActionResult<{ fullName: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/edit`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => updateMemorialProfile({ caller, input, deps }));
  if (result.ok) revalidateMemorial(input.memorialId);
  return result.ok ? { ok: true, data: { fullName: result.data.fullName } } : result;
}

export async function updateMemorialPrivacyAction(
  input: UpdateMemorialPrivacyInput,
): Promise<ActionResult<{ visibility: string; searchIndexingEnabled: boolean }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/customize`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => updateMemorialPrivacy({ caller, input, deps }));
  if (result.ok) revalidateMemorial(input.memorialId);
  return result.ok
    ? {
        ok: true,
        data: {
          visibility: result.data.visibility,
          searchIndexingEnabled: result.data.searchIndexingEnabled,
        },
      }
    : result;
}

export async function updateMemorialFeaturesAction(
  input: UpdateMemorialFeaturesInput,
): Promise<ActionResult<{ ok: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/customize`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => updateMemorialFeatures({ caller, input, deps }));
  if (result.ok) revalidateMemorial(input.memorialId);
  return result.ok ? { ok: true, data: { ok: true } } : result;
}
