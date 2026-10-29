/**
 * Funeral-event RSVP contacts (`funeral_events.contacts`, a jsonb array).
 * The database only guarantees an array of at most five; the shape of each
 * entry is the app's contract, so readers parse defensively.
 */

export interface EventContact {
  name: string;
  phone: string | null;
}

/** The well-formed `{name, phone}` entries of a `contacts` jsonb value. */
export function parseEventContacts(value: unknown): EventContact[] {
  if (!Array.isArray(value)) return [];
  const out: EventContact[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { name, phone } = entry as Record<string, unknown>;
    if (typeof name !== "string" || name.trim().length === 0) continue;
    out.push({
      name: name.trim(),
      phone: typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : null,
    });
  }
  return out;
}

/** "tel:+2348030000001" style href from a typed number; `null` when it has no digits. */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return /\d/.test(cleaned) ? `tel:${cleaned}` : null;
}
