/**
 * Memorial dates are stored as plain `YYYY-MM-DD` strings (no time, no zone).
 * These helpers format them for display without a date library and without
 * constructing a `Date` (which would apply the runtime's timezone).
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "2 March 1948" from "1948-03-02"; `null` for a missing or malformed value. */
export function formatMemorialDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [, y, mm, dd] = m;
  const month = MONTHS[Number(mm) - 1];
  if (!month) return null;
  return `${Number(dd)} ${month} ${y}`;
}

/**
 * A birth date for display: "2 March 1948", or just "1948" when only the year
 * is known (`yearOnly` — stored as YYYY-01-01, which must never read as
 * "1 January").
 */
export function formatBirthDate(iso: string | null | undefined, yearOnly: boolean): string | null {
  if (!yearOnly) return formatMemorialDate(iso);
  return iso && /^\d{4}/.test(iso) ? iso.slice(0, 4) : null;
}

/** "1948 – 2026", "1948 –", or "– 2026"; `null` when neither year is present. */
export function formatLifespan(
  birth: string | null | undefined,
  death: string | null | undefined,
): string | null {
  const b = birth?.slice(0, 4);
  const d = death?.slice(0, 4);
  if (!b && !d) return null;
  if (b && d) return `${b} – ${d}`;
  if (b) return `${b} –`;
  return `– ${d}`;
}

/**
 * "10:00 am" / "5:30 pm" from "10:00", "10:00:00" or "17:30". Returns `null`
 * for a missing or malformed value. No `Date`, no timezone.
 */
export function formatClockTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === 0 ? `${h12} ${period}` : `${h12}:${m[2]} ${period}`;
}

/** Just the year, e.g. "1948"; `null` if absent. */
export function yearOf(iso: string | null | undefined): string | null {
  const y = iso?.slice(0, 4);
  return y && /^\d{4}$/.test(y) ? y : null;
}
