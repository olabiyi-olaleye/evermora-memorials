"use server";

import { revalidatePath } from "next/cache";
import { requestFuneralService, type RequestFuneralServiceInput } from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

/** A family member asks Evermora for a facilitated service for their memorial. */
export async function submitServiceRequestAction(
  input: RequestFuneralServiceInput & { memorialId: string },
): Promise<ActionResult<{ received: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/services`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => requestFuneralService({ caller, input, deps }));
  if (result.ok) revalidatePath(`/memorials/${input.memorialId}/services`);
  return result.ok ? { ok: true, data: { received: true } } : result;
}
