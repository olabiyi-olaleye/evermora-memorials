"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeMemorialRole,
  inviteMemorialAdmin,
  transferMemorialOwnership,
  type ChangeMemorialRoleInput,
  type InviteMemorialAdminInput,
  type TransferMemorialOwnershipInput,
} from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Server Action adapters for the Phase 5K family-access operations. */

function revalidate(memorialId: string) {
  revalidatePath(`/memorials/${memorialId}/family`);
  revalidatePath("/");
}

export async function inviteMemorialAdminAction(
  input: InviteMemorialAdminInput,
): Promise<ActionResult<{ id: string; reinvited: boolean }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/family`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => inviteMemorialAdmin({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? { ok: true, data: { id: result.data.membership.id, reinvited: result.data.reinvited } }
    : result;
}

export async function changeMemorialRoleAction(
  input: ChangeMemorialRoleInput,
): Promise<ActionResult<{ role: string; status: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/family`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => changeMemorialRole({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? {
        ok: true,
        data: { role: result.data.membership.role, status: result.data.membership.status },
      }
    : result;
}

export async function transferMemorialOwnershipAction(
  input: TransferMemorialOwnershipInput,
): Promise<ActionResult<{ newOwnerProfileId: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/family`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => transferMemorialOwnership({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? { ok: true, data: { newOwnerProfileId: result.data.newOwnerProfileId } }
    : result;
}

/**
 * Accept an invitation. Backed by the `accept_memorial_invite` SECURITY DEFINER
 * RPC — it verifies the caller's JWT email against `invited_email`. On success
 * we send the new member to the memorial.
 */
export async function acceptMemorialInviteAction(
  membershipId: string,
): Promise<ActionResult<never>> {
  await requireAuthUser(`/invite/${membershipId}`);
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .rpc("accept_memorial_invite", { membership: membershipId })
    .maybeSingle();
  if (error || !data) {
    return {
      ok: false,
      error: {
        code: "not_found",
        message: "This invitation isn't valid for your account, or it has already been used.",
      },
    };
  }
  // The app shell reads the caller's memorial list — refresh it so the new
  // membership shows in the sidebar and switcher immediately.
  revalidatePath("/", "layout");
  redirect(`/memorials/${data.memorial_id}`);
}
