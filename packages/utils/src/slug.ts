/**
 * Generic slug string helpers.
 *
 * SCOPE BOUNDARY: this is pure string mechanics only. Evermora's slug *policy*
 * - reserved-route checks, length rules, uniqueness, alias history,
 * impersonation checks - lives in `@evermora/domain`, which wraps `slugify`.
 */

const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");
const NON_SLUG_CHARS = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;
const REPEATED_HYPHENS = /-{2,}/g;

/**
 * Normalise arbitrary text into a lowercase, ASCII, hyphen-delimited slug.
 * Diacritics are folded (Jose with an accent -> jose). Returns "" for input
 * with no slug-safe characters - callers decide whether that is acceptable.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_SLUG_CHARS, "-")
    .replace(REPEATED_HYPHENS, "-")
    .replace(EDGE_HYPHENS, "");
}

/** True when `value` is already in canonical slug form (and non-empty). */
export function isSlugFormat(value: string): boolean {
  return value.length > 0 && value === slugify(value);
}
