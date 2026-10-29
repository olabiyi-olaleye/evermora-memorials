/**
 * Plain-text sanitisation for visitor-supplied strings (tribute names,
 * messages). Evermora stores and renders these as plain text, never HTML, so
 * this strips markup and control characters rather than allowing a safe subset.
 */

const TAG = /<\/?[a-z][^>]*>/gi;

// Built from code points so the source file stays pure ASCII.
//  - C0 controls except \t (0x09) and \n (0x0A); DEL (0x7F); C1 range (0x80-0x9F)
//  - zero-width space/joiners (0x200B-0x200F), bidi controls/overrides
//    (0x202A-0x202E), word joiner (0x2060), BOM/ZWNBSP (0xFEFF)
const STRIP_CODE_POINTS = new Set<number>();
for (let c = 0x00; c <= 0x08; c++) STRIP_CODE_POINTS.add(c);
for (let c = 0x0b; c <= 0x1f; c++) STRIP_CODE_POINTS.add(c);
for (let c = 0x7f; c <= 0x9f; c++) STRIP_CODE_POINTS.add(c);
for (let c = 0x200b; c <= 0x200f; c++) STRIP_CODE_POINTS.add(c);
for (let c = 0x202a; c <= 0x202e; c++) STRIP_CODE_POINTS.add(c);
STRIP_CODE_POINTS.add(0x2060);
STRIP_CODE_POINTS.add(0xfeff);

function stripControl(s: string): string {
  let out = "";
  for (const ch of s) if (!STRIP_CODE_POINTS.has(ch.codePointAt(0)!)) out += ch;
  return out;
}

/**
 * - removes anything that looks like an HTML/XML tag
 * - removes control / zero-width / bidi-override characters
 * - normalises newlines, trims trailing whitespace per line, collapses 3+
 *   blank lines to 2, trims the whole string
 */
export function sanitizePlainText(input: string): string {
  return stripControl(input.replace(TAG, ""))
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Single-line variant: also collapses all internal whitespace to single spaces. */
export function sanitizeLine(input: string): string {
  return sanitizePlainText(input).replace(/\s+/g, " ").trim();
}

/**
 * Cuts `text` to at most `limit` words, at a word boundary — never mid-word.
 * Shared by every "Their Story" excerpt (the public memorial page and the
 * family-portal preview) so they can never drift out of sync on what counts
 * as "the beginning" of a story.
 */
export function truncateWords(
  text: string,
  limit: number,
): { excerpt: string; truncated: boolean } {
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return { excerpt: text.trim(), truncated: false };
  return { excerpt: words.slice(0, limit).join(" ") + "…", truncated: true };
}

/**
 * Copy for the "no funeral events yet" placeholder, phrased from the
 * family's own `funeral_planning_status` — shared by the public memorial
 * page and the family-portal preview so they never say something different
 * about the same memorial. `null` means: show nothing (a `completed` funeral
 * with no logged events is one the family chose not to detail, not one
 * that's still coming — "will be announced" would be the wrong promise).
 *
 * Takes the plain status string rather than `FuneralPlanningStatus` from
 * `@evermora/types` — this package stays dependency-free by design; the
 * literal values below are kept in sync with that type by hand.
 */
export function funeralPlaceholderCopy(
  status: "not_started" | "planning" | "partially_confirmed" | "confirmed" | "completed",
): string | null {
  switch (status) {
    case "not_started":
    case "planning":
      return "Funeral arrangements are being planned. The family will share the details here as they're confirmed — check back for updates.";
    case "partially_confirmed":
      return "Some funeral details are confirmed, with more on the way. Check back here for updates.";
    case "confirmed":
      return "Funeral details are confirmed and will appear here shortly.";
    case "completed":
      return null;
  }
}

/**
 * First + last initials, uppercased — the fallback avatar/share-card mark
 * for a memorial with no portrait. Shared by the hero (no-portrait avatar)
 * and the public share-card image generator, so both show the same initials
 * for the same person.
 */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}
