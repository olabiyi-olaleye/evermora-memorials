"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FUNERAL_EVENT_TYPE,
  FUNERAL_PLANNING_STATUS,
  MAX_FUNERAL_EVENT_CONTACTS,
  type FuneralEventContact,
  type FuneralEventType,
  type SectionVisibility,
} from "@evermora/types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  Button,
  StatusBadge,
} from "@evermora/ui";
import {
  formatClockTime,
  formatCoordinates,
  formatMemorialDate,
  mapSearchHref,
  parseMapCoordinates,
  type Coordinates,
} from "@evermora/utils";
import { FormError } from "@/components/form";
import type { FuneralEvent } from "@/lib/data/funeral";
import {
  cancelFuneralEventAction,
  completeFuneralEventAction,
  publishFuneralEventAction,
  removeFuneralEventAction,
  resolveMapLinkAction,
  saveFuneralEventAction,
  setFuneralPlanningStatusAction,
} from "@/lib/actions/funeral";

const TYPE_LABEL: Record<FuneralEventType, string> = {
  service_of_songs: "Service of Songs",
  wake: "Wake-Keeping",
  viewing: "Viewing",
  funeral_service: "Funeral Service",
  burial: "Burial",
  reception: "Reception",
  thanksgiving: "Thanksgiving Service",
  custom: "Other",
};

const PLANNING_LABEL: Record<string, string> = {
  not_started: "Not started",
  planning: "Being planned",
  partially_confirmed: "Partly confirmed",
  confirmed: "Confirmed",
  completed: "Completed",
};

const VISIBILITY_LABEL: Record<string, string> = {
  inherit: "Follow the section setting",
  members: "Family members only",
  public: "Anyone who can see the memorial",
  private: "Hidden from everyone for now",
};

const input =
  "w-full rounded-sm border border-line-strong bg-raised px-3 py-2 text-sm text-fg outline-none focus:outline-2 focus:outline-offset-1 focus:outline-brand focus:border-brand";

type ActionResult = { ok: boolean; error?: { message: string } };

export function FuneralEditor({
  memorialId,
  events,
  planningStatus,
}: {
  memorialId: string;
  events: FuneralEvent[];
  planningStatus: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function act(fn: () => Promise<ActionResult>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setAdding(false);
        setEditing(null);
        router.refresh();
      } else {
        setError(res.error?.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <PlanningStatus
        memorialId={memorialId}
        value={planningStatus}
        pending={pending}
        onChange={(status) => act(() => setFuneralPlanningStatusAction({ memorialId, status }))}
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-fg">Events</h2>
          {!adding ? (
            <Button
              size="sm"
              onClick={() => {
                setAdding(true);
                setEditing(null);
              }}
            >
              Add an event
            </Button>
          ) : null}
        </div>

        <FormError message={error} />

        {events.length === 0 && !adding ? (
          <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-sm text-fg-subtle">
            No events yet — a service of songs, the funeral service, a burial, a reception. Add each
            one; every event is shown or hidden on its own.
          </p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {events.map((e) => (
            <li key={e.id} className="rounded-lg border border-line p-4">
              {editing === e.id ? (
                <EventForm
                  memorialId={memorialId}
                  event={e}
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSubmit={(data) =>
                    act(() => saveFuneralEventAction({ ...data, id: e.id, memorialId }))
                  }
                />
              ) : (
                <EventRow
                  event={e}
                  pending={pending}
                  onEdit={() => {
                    setEditing(e.id);
                    setAdding(false);
                  }}
                  onPublish={() =>
                    act(() => publishFuneralEventAction({ memorialId, eventId: e.id }))
                  }
                  onCancel={() =>
                    act(() => cancelFuneralEventAction({ memorialId, eventId: e.id, reason: "" }))
                  }
                  onComplete={() =>
                    act(() => completeFuneralEventAction({ memorialId, eventId: e.id }))
                  }
                  onRemove={() =>
                    act(() => removeFuneralEventAction({ memorialId, eventId: e.id }))
                  }
                />
              )}
            </li>
          ))}
        </ul>

        {adding ? (
          <div className="rounded-lg border border-line p-4">
            <EventForm
              memorialId={memorialId}
              pending={pending}
              onCancel={() => setAdding(false)}
              onSubmit={(data) => act(() => saveFuneralEventAction({ ...data, memorialId }))}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PlanningStatus({
  value,
  pending,
  onChange,
}: {
  memorialId: string;
  value: string;
  pending: boolean;
  onChange: (status: (typeof FUNERAL_PLANNING_STATUS)[number]) => void;
}) {
  return (
    <section className="rounded-lg border border-line p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-fg">How are the arrangements coming along?</span>
        <span className="text-xs text-fg-subtle">
          This is just for the family&rsquo;s overview — it doesn&rsquo;t change what visitors see.
        </span>
        <select
          className={`${input} mt-1 max-w-xs`}
          value={value}
          disabled={pending}
          onChange={(e) => onChange(e.target.value as (typeof FUNERAL_PLANNING_STATUS)[number])}
        >
          {FUNERAL_PLANNING_STATUS.map((s) => (
            <option key={s} value={s}>
              {PLANNING_LABEL[s] ?? s}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

function EventRow({
  event: e,
  pending,
  onEdit,
  onPublish,
  onCancel,
  onComplete,
  onRemove,
}: {
  event: FuneralEvent;
  pending: boolean;
  onEdit: () => void;
  onPublish: () => void;
  onCancel: () => void;
  onComplete: () => void;
  onRemove: () => void;
}) {
  const when = e.eventDate
    ? formatMemorialDate(e.eventDate) +
      (formatClockTime(e.startTime) ? `, ${formatClockTime(e.startTime)}` : "")
    : "No date yet";
  const place = [e.venueName, e.city].filter(Boolean).join(", ");

  const badgeLabel =
    e.status === "published"
      ? e.visibility === "members"
        ? "Published · family only"
        : "Published"
      : e.status[0]!.toUpperCase() + e.status.slice(1);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-fg">{e.title}</p>
          <StatusBadge status={e.status} label={badgeLabel} />
        </div>
        <p className="mt-1.5 text-sm text-fg-muted">
          {when}
          {place ? ` · ${place}` : ""}
        </p>
        {e.status === "cancelled" && e.cancelReason ? (
          <p className="mt-1 text-sm text-bad">{e.cancelReason}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onEdit} disabled={pending}>
          Edit
        </Button>
        {e.status === "draft" || e.status === "cancelled" ? (
          <Button size="sm" onClick={onPublish} loading={pending}>
            {e.status === "cancelled" ? "Reinstate" : "Publish"}
          </Button>
        ) : null}
        {e.status === "published" ? (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="secondary" disabled={pending}>
                  Mark cancelled
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent
                title={`Mark "${e.title}" as cancelled?`}
                description="It stays on the memorial, shown clearly as cancelled so guests know not to attend."
                confirmLabel="Mark cancelled"
                tone="danger"
                onConfirm={onCancel}
              />
            </AlertDialog>
            <Button size="sm" variant="secondary" onClick={onComplete} disabled={pending}>
              Mark done
            </Button>
          </>
        ) : null}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="ghost" disabled={pending}>
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            title={`Remove "${e.title}"?`}
            description="This event will be permanently deleted. This can't be undone."
            confirmLabel="Remove"
            tone="danger"
            onConfirm={onRemove}
          />
        </AlertDialog>
      </div>
    </div>
  );
}

interface EventFormData {
  eventType: FuneralEventType;
  title: string;
  description: string;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueName: string;
  addressLine: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  dressCode: string;
  contacts: FuneralEventContact[];
  instructions: string;
  livestreamUrl: string;
  visibility: SectionVisibility;
}

/** An editable contact row; both fields stay strings while typing. */
type ContactDraft = { name: string; phone: string };

function EventForm({
  memorialId,
  event: e,
  pending,
  onCancel,
  onSubmit,
}: {
  memorialId: string;
  event?: FuneralEvent;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (data: EventFormData) => void;
}) {
  const [eventType, setEventType] = useState<FuneralEventType>(e?.eventType ?? "funeral_service");
  const [title, setTitle] = useState(e?.title ?? "");
  const [description, setDescription] = useState(e?.description ?? "");
  const [eventDate, setEventDate] = useState(e?.eventDate ?? "");
  const [startTime, setStartTime] = useState((e?.startTime ?? "").slice(0, 5));
  const [endTime, setEndTime] = useState((e?.endTime ?? "").slice(0, 5));
  const [venueName, setVenueName] = useState(e?.venueName ?? "");
  const [addressLine, setAddressLine] = useState(e?.addressLine ?? "");
  const [city, setCity] = useState(e?.city ?? "");
  const [pin, setPin] = useState<Coordinates | null>(
    e?.latitude != null && e?.longitude != null
      ? { latitude: e.latitude, longitude: e.longitude }
      : null,
  );
  const [pinLink, setPinLink] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [resolvingPin, startResolvingPin] = useTransition();
  const [dressCode, setDressCode] = useState(e?.dressCode ?? "");
  const [contacts, setContacts] = useState<ContactDraft[]>(
    (e?.contacts ?? []).map((c) => ({ name: c.name, phone: c.phone ?? "" })),
  );
  const [contactError, setContactError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState(e?.instructions ?? "");
  const [livestreamUrl, setLivestreamUrl] = useState(e?.livestreamUrl ?? "");
  const [visibility, setVisibility] = useState<SectionVisibility>(e?.visibility ?? "inherit");

  const suggestedTitle = TYPE_LABEL[eventType];

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        const filled = contacts
          .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() || null }))
          .filter((c) => c.name || c.phone);
        if (pinLink.trim()) {
          setPinError("Set the pin from that link first, or clear it.");
          return;
        }
        if (filled.some((c) => !c.name)) {
          setContactError("Add a name for each RSVP contact.");
          return;
        }
        setContactError(null);
        onSubmit({
          eventType,
          title: (title.trim() || suggestedTitle).trim(),
          description: description.trim(),
          eventDate: eventDate || null,
          startTime: startTime || null,
          endTime: endTime || null,
          venueName: venueName.trim(),
          addressLine: addressLine.trim(),
          city: city.trim(),
          latitude: pin?.latitude ?? null,
          longitude: pin?.longitude ?? null,
          dressCode: dressCode.trim(),
          // Rows left completely blank are dropped.
          contacts: filled,
          instructions: instructions.trim(),
          livestreamUrl: livestreamUrl.trim(),
          visibility,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Type</span>
          <select
            className={input}
            value={eventType}
            onChange={(ev) => setEventType(ev.target.value as FuneralEventType)}
          >
            {FUNERAL_EVENT_TYPE.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Title</span>
          <input
            className={input}
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            placeholder={suggestedTitle}
            maxLength={200}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Date</span>
          <input
            className={input}
            type="date"
            value={eventDate}
            onChange={(ev) => setEventDate(ev.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Start</span>
          <input
            className={input}
            type="time"
            value={startTime}
            onChange={(ev) => setStartTime(ev.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">End (optional)</span>
          <input
            className={input}
            type="time"
            value={endTime}
            onChange={(ev) => setEndTime(ev.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-fg">Venue</span>
        <input
          className={input}
          value={venueName}
          onChange={(ev) => setVenueName(ev.target.value)}
          maxLength={200}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Address</span>
          <input
            className={input}
            value={addressLine}
            onChange={(ev) => setAddressLine(ev.target.value)}
            maxLength={300}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Town / city</span>
          <input
            className={input}
            value={city}
            onChange={(ev) => setCity(ev.target.value)}
            maxLength={120}
          />
        </label>
      </div>

      <MapPinField
        pin={pin}
        link={pinLink}
        error={pinError}
        resolving={resolvingPin}
        onLinkChange={(v) => {
          setPinLink(v);
          setPinError(null);
        }}
        onResolve={() => {
          const link = pinLink.trim();
          if (!link || resolvingPin) return;
          // Full links and bare coordinates resolve right here; only a
          // phone-app share link (maps.app.goo.gl) needs the server.
          const local = parseMapCoordinates(link);
          if (local) {
            setPin(local);
            setPinLink("");
            setPinError(null);
            return;
          }
          startResolvingPin(async () => {
            const res = await resolveMapLinkAction(memorialId, link);
            if (res.ok) {
              setPin(res.data);
              setPinLink("");
              setPinError(null);
            } else {
              setPinError(res.error.message);
            }
          });
        }}
        onRemove={() => setPin(null)}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-fg">Details (optional)</span>
        <textarea
          className={input}
          rows={3}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          maxLength={4000}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-fg">
          Instructions for guests (optional) — parking, order of service, what to bring
        </span>
        <textarea
          className={input}
          rows={2}
          value={instructions}
          onChange={(ev) => setInstructions(ev.target.value)}
          maxLength={4000}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Dress code (optional)</span>
          <input
            className={input}
            value={dressCode}
            onChange={(ev) => setDressCode(ev.target.value)}
            maxLength={200}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-fg">Livestream link (optional)</span>
          <input
            className={input}
            type="url"
            inputMode="url"
            value={livestreamUrl}
            onChange={(ev) => setLivestreamUrl(ev.target.value)}
            placeholder="https://…"
            maxLength={2000}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="font-medium text-fg">RSVP contacts (optional)</legend>
        <p className="text-xs text-fg-subtle">
          Up to {MAX_FUNERAL_EVENT_CONTACTS} people guests can call about this event.
        </p>
        {contacts.map((c, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
            <input
              className={input}
              aria-label={`Contact ${i + 1} name`}
              placeholder="Name"
              value={c.name}
              onChange={(ev) =>
                setContacts((cs) =>
                  cs.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)),
                )
              }
              maxLength={200}
            />
            <input
              className={input}
              aria-label={`Contact ${i + 1} phone`}
              placeholder="Phone"
              type="tel"
              inputMode="tel"
              value={c.phone}
              onChange={(ev) =>
                setContacts((cs) =>
                  cs.map((x, j) => (j === i ? { ...x, phone: ev.target.value } : x)),
                )
              }
              maxLength={60}
            />
            <button
              type="button"
              onClick={() => setContacts((cs) => cs.filter((_, j) => j !== i))}
              className="justify-self-start text-sm text-fg-subtle hover:text-fg"
            >
              Remove
            </button>
          </div>
        ))}
        {contacts.length < MAX_FUNERAL_EVENT_CONTACTS ? (
          <button
            type="button"
            onClick={() => setContacts((cs) => [...cs, { name: "", phone: "" }])}
            className="self-start text-sm text-brand underline hover:text-brand-hover"
          >
            Add a contact
          </button>
        ) : null}
        {contactError ? (
          <p role="alert" className="text-sm text-bad">
            {contactError}
          </p>
        ) : null}
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-fg">Who can see this event</span>
        <select
          className={`${input} max-w-xs`}
          value={visibility}
          onChange={(ev) => setVisibility(ev.target.value as SectionVisibility)}
        >
          {(["inherit", "members", "public", "private"] as const).map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABEL[v]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-sm text-fg-subtle hover:text-fg">
          Cancel
        </button>
        <Button type="submit" loading={pending} disabled={!title.trim() && !suggestedTitle}>
          {e ? "Save changes" : "Add event"}
        </Button>
      </div>
      <p className="text-xs text-fg-subtle">
        New events start as a draft. Publish it when the details are settled.
      </p>
    </form>
  );
}

/**
 * The venue's exact map pin. Families paste what they already have — a link
 * from Google Maps' Share button, or coordinates — rather than placing a pin
 * on a map here (no maps SDK, API key or billing). The public page then
 * links guests to the exact spot, with turn-by-turn directions.
 */
function MapPinField({
  pin,
  link,
  error,
  resolving,
  onLinkChange,
  onResolve,
  onRemove,
}: {
  pin: Coordinates | null;
  link: string;
  error: string | null;
  resolving: boolean;
  onLinkChange: (value: string) => void;
  onResolve: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor="map-pin-link" className="font-medium text-fg">
        Map pin (optional)
      </label>
      <p className="text-xs text-fg-subtle">
        So guests get directions to the exact spot. In Google Maps, find the venue (or press and
        hold to drop a pin), tap Share, copy the link and paste it here.
      </p>
      {pin ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted">
          <span>
            Pin set: <span className="text-fg tabular-nums">{formatCoordinates(pin)}</span>
          </span>
          <a
            href={mapSearchHref(pin, null)!}
            target="_blank"
            rel="noreferrer noopener"
            className="text-brand underline hover:text-brand-hover"
          >
            Check on map
          </a>
          <button type="button" onClick={onRemove} className="text-fg-subtle hover:text-fg">
            Remove pin
          </button>
        </p>
      ) : null}
      <div className="flex gap-2">
        <input
          id="map-pin-link"
          className={input}
          inputMode="url"
          value={link}
          onChange={(ev) => onLinkChange(ev.target.value)}
          onBlur={onResolve}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              onResolve();
            }
          }}
          placeholder={pin ? "Paste a different link to move the pin" : "https://maps.app.goo.gl/…"}
          maxLength={2000}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onResolve}
          loading={resolving}
          disabled={!link.trim()}
        >
          Set pin
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
