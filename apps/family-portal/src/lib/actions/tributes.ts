"use server";

import { revalidatePath } from "next/cache";
import {
  approveTribute,
  hideTribute,
  rejectTribute,
  type ModerateTributeInput,
} from "@evermora/domain";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";

function revalidate(memorialId: string) {
  revalidatePath("/");
  revalidatePath(`/memorials/${memorialId}`, "layout");
}

type Result = ActionResult<{ status: string }>;

async function moderate(op: typeof approveTribute, input: ModerateTributeInput): Promise<Result> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/tributes`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => op({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

export async function approveTributeAction(input: ModerateTributeInput): Promise<Result> {
  return moderate(approveTribute, input);
}
export async function rejectTributeAction(input: ModerateTributeInput): Promise<Result> {
  return moderate(rejectTribute, input);
}
export async function hideTributeAction(input: ModerateTributeInput): Promise<Result> {
  return moderate(hideTribute, input);
}
