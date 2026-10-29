"use server";

import { revalidatePath } from "next/cache";
import {
  cancelFuneralEvent,
  completeFuneralEvent,
  publishFuneralEvent,
  removeFuneralEvent,
  saveFuneralEvent,
  setFuneralPlanningStatus,
  type FuneralEventLifecycleInput,
  type RemoveFuneralEventInput,
  type SaveFuneralEventInput,
  type SetFuneralPlanningStatusInput,
} from "@evermora/domain";
import { isShortMapLink, parseMapCoordinates, type Coordinates } from "@evermora/utils";
import { requireAuthUser, toCallerContext } from "@/lib/auth";
import { runOperation, type ActionResult } from "@/lib/domain";
import { resolveShortMapLink } from "@/lib/map-link";

/**
 * Server Action adapters for the Phase 5H funeral operations.
 * authenticate → CallerContext → domain op → revalidate the memorial's pages.
 */

function revalidate(memorialId: string) {
  revalidatePath("/");
  revalidatePath(`/memorials/${memorialId}`, "layout");
}

export async function saveFuneralEventAction(
  input: SaveFuneralEventInput,
): Promise<ActionResult<{ id: string; created: boolean }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/funeral`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => saveFuneralEvent({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok
    ? { ok: true, data: { id: result.data.event.id, created: result.data.created } }
    : result;
}

/**
 * Reads a venue pin from a pasted map link. Full links and bare coordinates
 * are parsed in the browser already; this exists for the phone app's
 * `maps.app.goo.gl` share links, which only reveal a pin by following their
 * redirect — something only the server can do (cross-origin). Signed-in
 * family members only, so it can't be used as an open link expander.
 */
export async function resolveMapLinkAction(
  memorialId: string,
  link: string,
): Promise<ActionResult<Coordinates>> {
  await requireAuthUser(`/memorials/${memorialId}/funeral`);
  const coords =
    parseMapCoordinates(link) ?? (isShortMapLink(link) ? await resolveShortMapLink(link) : null);
  return coords
    ? { ok: true, data: coords }
    : {
        ok: false,
        error: {
          code: "no_pin",
          message:
            "We couldn't find a pin in that link. In Google Maps, press and hold on the venue to drop a pin, then share that — or paste the coordinates, like 6.4402, 7.4943.",
        },
      };
}

export async function publishFuneralEventAction(
  input: FuneralEventLifecycleInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/funeral`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => publishFuneralEvent({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

export async function cancelFuneralEventAction(
  input: FuneralEventLifecycleInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/funeral`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => cancelFuneralEvent({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

export async function completeFuneralEventAction(
  input: FuneralEventLifecycleInput,
): Promise<ActionResult<{ status: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/funeral`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => completeFuneralEvent({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

export async function removeFuneralEventAction(
  input: RemoveFuneralEventInput,
): Promise<ActionResult<{ removed: true }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/funeral`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => removeFuneralEvent({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}

export async function setFuneralPlanningStatusAction(
  input: SetFuneralPlanningStatusInput,
): Promise<ActionResult<{ funeralPlanningStatus: string }>> {
  const user = await requireAuthUser(`/memorials/${input.memorialId}/funeral`);
  const caller = toCallerContext(user);
  const result = await runOperation((deps) => setFuneralPlanningStatus({ caller, input, deps }));
  if (result.ok) revalidate(input.memorialId);
  return result;
}
