"use server";

import { revalidatePath } from "next/cache";
import {
  resolveReport,
  setMemorialModeration,
  updateServiceRequest,
  type ResolveReportInput,
  type SetMemorialModerationInput,
  type UpdateServiceRequestInput,
} from "@evermora/domain";
import { requirePlatformAdmin, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

export async function setMemorialModerationAction(
  input: SetMemorialModerationInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requirePlatformAdmin("/memorials");
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => setMemorialModeration({ caller, input, deps }));
  if (result.ok) revalidatePath("/memorials");
  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

export async function resolveReportAction(
  input: ResolveReportInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requirePlatformAdmin("/reports");
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => resolveReport({ caller, input, deps }));
  if (result.ok) {
    revalidatePath("/reports");
    revalidatePath("/");
  }
  return result.ok ? { ok: true, data: { status: result.data.report.status } } : result;
}

export async function updateServiceRequestAction(
  input: UpdateServiceRequestInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requirePlatformAdmin("/service-requests");
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => updateServiceRequest({ caller, input, deps }));
  if (result.ok) {
    revalidatePath("/service-requests");
    revalidatePath("/");
  }
  return result.ok ? { ok: true, data: { status: result.data.request.status } } : result;
}
