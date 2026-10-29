import { z } from "zod";
import {
  FUNERAL_EVENT_TYPE,
  MAX_FUNERAL_EVENT_CONTACTS,
  SECTION_VISIBILITY,
  type MemorialId,
} from "@evermora/types";
import { isSafeHttpUrl } from "@evermora/utils";
import { isAuthenticated, type CallerContext } from "../context";
import { NotFoundError, UnauthenticatedError, ValidationError } from "../errors";
import type { Repositories } from "../ports/repositories";
import type { FuneralEventPatch, FuneralEventRow } from "../ports/rows";
import type { OperationDeps } from "./deps";
import { requireMemorialPermission } from "./guard";

/**
 * saveFuneralEvent — contract: `docs/domain/operations/save-funeral-event.md`.
 *
 * Create (no `id`) or update (`id`) one funeral / memorial event. `funeral.manage`
 * (owner / admin / content_editor) or a platform admin. A new event starts as
 * `draft`; use `publishFuneralEvent` to make it public. Privacy is
 * **event-level** (§39) — the whole card is shown or not, per `visibility`.
 */

const optionalText = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max))
    .transform((s) => (s.length === 0 ? null : s))
    .nullable()
    .optional();

const InputSchema = z
  .object({
    memorialId: z.string().uuid(),
    id: z.string().uuid().optional(),
    eventType: z.enum(FUNERAL_EVENT_TYPE).default("custom"),
    title: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "A title is required.").max(200)),
    description: optionalText(4000),
    eventDate: z.string().date().nullable().optional(),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM.")
      .nullable()
      .optional(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM.")
      .nullable()
      .optional(),
    timezone: optionalText(64),
    venueName: optionalText(200),
    addressLine: optionalText(300),
    city: optionalText(120),
    region: optionalText(120),
    country: optionalText(120),
    postalCode: optionalText(32),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    dressCode: optionalText(200),
    contacts: z
      .array(
        z
          .object({
            name: z
              .string()
              .transform((s) => s.trim())
              .pipe(z.string().min(1, "Each contact needs a name.").max(200)),
            phone: optionalText(60),
          })
          .strict()
          .transform((c) => ({ name: c.name, phone: c.phone ?? null })),
      )
      .max(MAX_FUNERAL_EVENT_CONTACTS, `Add at most ${MAX_FUNERAL_EVENT_CONTACTS} contacts.`)
      .optional(),
    livestreamUrl: z
      .string()
      .max(2000)
      .refine(isSafeHttpUrl, "Enter a valid http:// or https:// link.")
      .nullable()
      .optional()
      .or(z.literal("")),
    instructions: optionalText(4000),
    visibility: z.enum(SECTION_VISIBILITY).default("inherit"),
  })
  .strict();

export type SaveFuneralEventInput = z.input<typeof InputSchema>;

export interface SaveFuneralEventResult {
  event: FuneralEventRow;
  created: boolean;
}

const DETAIL_KEYS = [
  "eventType",
  "title",
  "description",
  "eventDate",
  "startTime",
  "endTime",
  "timezone",
  "venueName",
  "addressLine",
  "city",
  "region",
  "country",
  "postalCode",
  "latitude",
  "longitude",
  "dressCode",
  "contacts",
  "livestreamUrl",
  "instructions",
  "visibility",
] as const;

export async function saveFuneralEvent(params: {
  caller: CallerContext;
  input: SaveFuneralEventInput;
  deps: OperationDeps;
}): Promise<SaveFuneralEventResult> {
  const { caller, deps } = params;
  if (!isAuthenticated(caller)) {
    throw new UnauthenticatedError("You must be signed in to manage funeral information.");
  }
  const parsed = InputSchema.safeParse(params.input);
  if (!parsed.success) {
    throw new ValidationError("The funeral event is invalid.", {
      reason: "invalid_input",
      fields: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const { memorialId: rawId, id, ...fields } = parsed.data;
  const memorialId = rawId as MemorialId;

  if (fields.startTime && fields.endTime && fields.endTime < fields.startTime) {
    throw new ValidationError("The end time is before the start time.", { reason: "time_order" });
  }
  const livestreamUrl = fields.livestreamUrl === "" ? null : (fields.livestreamUrl ?? undefined);

  return deps.unitOfWork.transaction(caller, async (repos) => {
    await requireMemorialPermission(repos, caller, memorialId, "funeral.manage");

    if (id) {
      const existing = await repos.funeralEvents.findById(id);
      if (!existing || existing.memorialId !== memorialId) {
        throw new NotFoundError("That funeral event does not exist.");
      }
      const patch: FuneralEventPatch = { livestreamUrl };
      for (const k of DETAIL_KEYS) {
        if (k in fields && fields[k] !== undefined)
          (patch as Record<string, unknown>)[k] = fields[k];
      }
      const event = await repos.funeralEvents.update(id, patch);
      await audit(repos, caller, memorialId, event.id, "funeral_event.updated");
      return { event, created: false };
    }

    const siblings = await repos.funeralEvents.listForMemorial(memorialId);
    const nextOrder = siblings.reduce((m, e) => Math.max(m, e.displayOrder + 1), 0);
    const event = await repos.funeralEvents.create({
      id: deps.ids.newId(),
      memorialId,
      eventType: fields.eventType,
      title: fields.title,
      description: fields.description ?? null,
      eventDate: fields.eventDate ?? null,
      startTime: fields.startTime ?? null,
      endTime: fields.endTime ?? null,
      timezone: fields.timezone ?? null,
      venueName: fields.venueName ?? null,
      addressLine: fields.addressLine ?? null,
      city: fields.city ?? null,
      region: fields.region ?? null,
      country: fields.country ?? null,
      postalCode: fields.postalCode ?? null,
      latitude: fields.latitude ?? null,
      longitude: fields.longitude ?? null,
      dressCode: fields.dressCode ?? null,
      contacts: fields.contacts ?? [],
      livestreamUrl: livestreamUrl ?? null,
      instructions: fields.instructions ?? null,
      visibility: fields.visibility,
      displayOrder: nextOrder,
    });
    await audit(repos, caller, memorialId, event.id, "funeral_event.created");
    deps.events.record("funeral_event.created", { memorialId, funeralEventId: event.id });
    return { event, created: true };
  });
}

async function audit(
  repos: Repositories,
  caller: CallerContext,
  memorialId: MemorialId,
  entityId: string,
  action: string,
): Promise<void> {
  await repos.audit.record({
    actorProfileId: caller.userId,
    actorKind: caller.isPlatformAdmin ? "platform_admin" : "user",
    action,
    entityType: "funeral_event",
    entityId,
    memorialId,
  });
}
