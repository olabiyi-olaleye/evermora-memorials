import { Badge } from "@evermora/ui";
import {
  formatClockTime,
  formatMemorialDate,
  funeralPlaceholderCopy,
  mapDirectionsHref,
  mapSearchHref,
  telHref,
} from "@evermora/utils";
import type { FuneralEventContact, FuneralPlanningStatus } from "@evermora/types";
import type { PublicFuneralEvent } from "@/lib/memorial";

const EVENT_TYPE_LABEL: Record<string, string> = {
  service_of_songs: "Service of Songs",
  wake: "Wake-Keeping",
  viewing: "Viewing",
  funeral_service: "Funeral Service",
  burial: "Burial",
  reception: "Reception",
  thanksgiving: "Thanksgiving Service",
  custom: "",
};

function whenLine(e: PublicFuneralEvent): string | null {
  const date = formatMemorialDate(e.eventDate);
  const start = formatClockTime(e.startTime);
  const end = formatClockTime(e.endTime);
  const time = start && end ? `${start} – ${end}` : start;
  if (date && time) return `${date}, ${time}`;
  return date ?? time ?? null;
}

export function FuneralEvents({
  events,
  planningStatus,
}: {
  events: PublicFuneralEvent[];
  /** Only consulted when `events` is empty — decides the placeholder, if any. */
  planningStatus: FuneralPlanningStatus;
}) {
  if (events.length === 0) {
    const placeholder = funeralPlaceholderCopy(planningStatus);
    if (!placeholder) return null;
    return (
      <section className="mt-16 border-t border-accent/25 pt-10 sm:mt-20 sm:pt-14">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
          Arrangements
        </p>
        <h2 className="mt-3 font-serif text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] text-fg">
          Funeral arrangements
        </h2>
        <p className="mt-4 max-w-2xl text-fg-muted">{placeholder}</p>
      </section>
    );
  }

  const contacts = sectionContacts(events);

  return (
    <section className="mt-16 border-t border-accent/25 pt-10 sm:mt-20 sm:pt-14">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">
        Arrangements
      </p>
      <h2 className="mt-3 font-serif text-[clamp(1.5rem,1.2rem+1.1vw,2rem)] text-fg">
        Funeral arrangements
      </h2>

      <ul className="mt-8 flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
        {events.map((e) => {
          const cancelled = e.status === "cancelled";
          const when = whenLine(e);
          const place = [e.venueName, e.addressLine, e.city, e.region, e.country]
            .filter(Boolean)
            .join(", ");
          // The family's pin when they set one (exact); otherwise a search
          // for the address. Directions only to a pin — routing guests to a
          // text-search guess would be worse than no button.
          const mapHref = mapSearchHref(e.coordinates, e.mapQuery);
          const directionsHref = mapDirectionsHref(e.coordinates);
          const kind = EVENT_TYPE_LABEL[e.eventType] ?? "";
          return (
            <li key={e.id} className={cancelled ? "p-5 opacity-70 sm:p-6" : "p-5 sm:p-6"}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg text-fg">{e.title}</h3>
                {cancelled ? (
                  <Badge tone="bad" withDot>
                    Cancelled
                  </Badge>
                ) : kind && kind !== e.title ? (
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-fg-subtle uppercase">
                    {kind}
                  </span>
                ) : null}
              </div>

              {cancelled && e.cancelReason ? (
                <p className="mt-2 text-sm text-bad">{e.cancelReason}</p>
              ) : null}

              {!cancelled ? (
                <dl className="mt-3 grid grid-cols-[4rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                  {when ? <Line label="When" value={when} /> : null}
                  {place || e.coordinates ? (
                    <>
                      <dt className="text-fg-subtle">Where</dt>
                      <dd className="text-fg-muted">
                        {place}
                        {[
                          { href: mapHref, label: "Map" },
                          { href: directionsHref, label: "Directions" },
                        ]
                          .filter((l): l is { href: string; label: string } => l.href !== null)
                          .map((l, i) => (
                            <span key={l.label}>
                              {place || i > 0 ? " · " : ""}
                              <a
                                href={l.href}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-brand underline hover:text-brand-hover"
                              >
                                {l.label}
                              </a>
                            </span>
                          ))}
                      </dd>
                    </>
                  ) : null}
                  {e.dressCode ? <Line label="Dress" value={e.dressCode} /> : null}
                </dl>
              ) : null}

              {!cancelled && e.description ? (
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-fg-muted">
                  {e.description}
                </p>
              ) : null}

              {!cancelled && e.instructions ? (
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-fg-subtle">
                  {e.instructions}
                </p>
              ) : null}

              {!cancelled && e.livestreamUrl ? (
                <p className="mt-3 text-sm">
                  <a
                    href={e.livestreamUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-brand underline hover:text-brand-hover"
                  >
                    Watch the livestream
                  </a>
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {contacts.length > 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
          <h3 className="text-[11px] font-semibold tracking-[0.2em] text-accent uppercase">RSVP</h3>
          <p className="mt-2 text-sm text-fg-subtle">
            For any of the arrangements above, please contact:
          </p>
          {/* Contacts side by side, each one name above number; they wrap
           * onto more lines when the card is narrow; phones get two tidy columns. */}
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:flex sm:flex-wrap sm:gap-x-12">
            {contacts.map((c) => {
              const tel = telHref(c.phone);
              return (
                <li key={contactKey(c)} className="flex flex-col">
                  <span className="text-fg">{c.name}</span>
                  {c.phone ? (
                    tel ? (
                      <a
                        href={tel}
                        className="self-start text-brand underline tabular-nums hover:text-brand-hover"
                      >
                        {c.phone}
                      </a>
                    ) : (
                      <span className="text-fg-muted">{c.phone}</span>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function contactKey(c: FuneralEventContact): string {
  return `${c.name.trim().toLowerCase()}|${(c.phone ?? "").replace(/[^\d+]/g, "")}`;
}

/**
 * One RSVP list for the whole section rather than repeated under every
 * event — families almost always give the same people for each. Contacts
 * from all events that are still going ahead, de-duplicated (same name and
 * number, however formatted), in the order they first appear.
 */
function sectionContacts(events: PublicFuneralEvent[]): FuneralEventContact[] {
  const seen = new Set<string>();
  const out: FuneralEventContact[] = [];
  for (const e of events) {
    if (e.status === "cancelled") continue;
    for (const c of e.contacts) {
      const key = contactKey(c);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="text-fg-muted">{value}</dd>
    </>
  );
}
