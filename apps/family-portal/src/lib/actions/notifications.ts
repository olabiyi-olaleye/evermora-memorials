"use server";

import { revalidatePath } from "next/cache";
import { markNotificationsRead, type MarkNotificationsReadInput } from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

export async function markNotificationsReadAction(
  input: MarkNotificationsReadInput,
): Promise<ActionResult<{ ok: true }>> {
  const user = await requireAuthUser();
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => markNotificationsRead({ caller, input, deps }));
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
