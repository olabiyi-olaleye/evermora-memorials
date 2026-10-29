"use server";

import { headers } from "next/headers";
import { editTribute, requestFuneralService, submitTribute } from "@evermora/domain";
import { anonCaller, runOperation, type ActionResult } from "@/lib/domain";
import { getTributeByEditToken, type MyTribute } from "@/lib/tributes";

export interface SubmitTributeFields {
  memorialId: string;
  authorDisplayName: string;
  authorRelationship?: string;
  message: string;
  honeypot?: string;
}

function clientIp(h: Headers): string | undefined {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? undefined;
}

/**
 * A visitor leaves a tribute. The domain layer applies moderation / anti-abuse.
 * `editToken` is the visitor's only proof of authorship for a later edit — the
 * caller is expected to keep it (e.g. localStorage); Evermora never shows or
 * sends it back another way. Null when the submission was silently discarded
 * (honeypot).
 */
export async function submitTributeAction(fields: SubmitTributeFields): Promise<
  ActionResult<{
    status: "pending" | "approved" | "discarded";
    tributeId: string | null;
    editToken: string | null;
  }>
> {
  const h = await headers();
  const caller = anonCaller({
    ip: clientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });

  const result = await runOperation((deps) =>
    submitTribute({
      caller,
      input: {
        memorialId: fields.memorialId,
        authorDisplayName: fields.authorDisplayName,
        authorRelationship: fields.authorRelationship,
        message: fields.message,
        honeypot: fields.honeypot,
      },
      deps,
    }),
  );

  return result.ok
    ? {
        ok: true,
        data: {
          status: result.data.status,
          tributeId: result.data.tributeId,
          editToken: result.data.editToken,
        },
      }
    : result;
}

export interface EditTributeFields {
  editToken: string;
  authorDisplayName: string;
  authorRelationship?: string;
  message: string;
}

/** A visitor edits their own tribute, proven only by the token `submitTributeAction` handed back. */
export async function editTributeAction(
  fields: EditTributeFields,
): Promise<ActionResult<{ status: "pending" | "approved" }>> {
  const h = await headers();
  const caller = anonCaller({
    ip: clientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });

  const result = await runOperation((deps) =>
    editTribute({
      caller,
      input: {
        editToken: fields.editToken,
        authorDisplayName: fields.authorDisplayName,
        authorRelationship: fields.authorRelationship,
        message: fields.message,
      },
      deps,
    }),
  );

  return result.ok ? { ok: true, data: { status: result.data.status } } : result;
}

/** Fetch a visitor's own tribute by their private edit token, to pre-fill an edit form. */
export async function getMyTributeAction(editToken: string): Promise<MyTribute | null> {
  return getTributeByEditToken(editToken);
}

export interface ServiceRequestFields {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  serviceType:
    "funeral_planning" | "printing" | "livestream" | "catering" | "transport" | "flowers" | "other";
  details?: string;
  memorialId?: string;
  website?: string;
}

/** A visitor (or family member) asks Evermora for a facilitated service. */
export async function submitServiceRequestAction(
  fields: ServiceRequestFields,
): Promise<ActionResult<{ received: true }>> {
  const h = await headers();
  const caller = anonCaller({
    ip: clientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });

  const result = await runOperation((deps) =>
    requestFuneralService({
      caller,
      input: {
        memorialId: fields.memorialId ?? null,
        contactName: fields.contactName,
        contactEmail: fields.contactEmail,
        contactPhone: fields.contactPhone,
        serviceType: fields.serviceType,
        details: fields.details,
        website: fields.website,
      },
      deps,
    }),
  );

  return result.ok ? { ok: true, data: { received: true } } : result;
}
