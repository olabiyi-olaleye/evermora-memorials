import { slugify } from "@evermora/utils";

/**
 * The authoritative memorial-slug grammar — kept identical to the SQL functions
 * `app.normalize_slug` / `app.slug_is_valid` and the `memorial_slugs_validate`
 * trigger (see `docs/architecture/memorial-url-architecture.md`). The DB trigger
 * enforces the same rules on write, so this is defence-in-depth + good error
 * messages, never the sole guarantee.
 *
 *   - normalise: lowercase, trim, spaces/underscores/punctuation → single hyphen
 *   - 3..63 characters
 *   - lowercase ASCII letters, digits, single hyphens; no leading/trailing/doubled hyphen
 *   - at least one letter (rejects pure-numeric slugs)
 *   - the charset alone blocks path-traversal / encoded-path characters
 */

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 63;

const GRAMMAR = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HAS_LETTER = /[a-z]/;

/** Pure normalisation. Returns `""` when nothing slug-safe remains. */
export function normalizeSlug(raw: string): string {
  return slugify(raw);
}

export type SlugRejection = "too_short" | "too_long" | "bad_grammar" | "pure_numeric" | "empty";

export interface SlugCheck {
  ok: boolean;
  normalized: string;
  rejection?: SlugRejection;
}

/** Normalise `raw` and check it against the grammar. */
export function checkSlug(raw: string): SlugCheck {
  const normalized = normalizeSlug(raw);
  if (normalized.length === 0) return { ok: false, normalized, rejection: "empty" };
  if (normalized.length < SLUG_MIN_LENGTH) return { ok: false, normalized, rejection: "too_short" };
  if (normalized.length > SLUG_MAX_LENGTH) return { ok: false, normalized, rejection: "too_long" };
  if (!GRAMMAR.test(normalized)) return { ok: false, normalized, rejection: "bad_grammar" };
  if (!HAS_LETTER.test(normalized)) return { ok: false, normalized, rejection: "pure_numeric" };
  return { ok: true, normalized };
}
