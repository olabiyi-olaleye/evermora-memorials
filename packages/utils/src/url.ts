/**
 * Guards against a malicious URL scheme (`javascript:`, `data:`, `vbscript:`,
 * `file:`, …) in a family-supplied external link that Evermora later renders
 * as a plain `<a href>` (e.g. a funeral event's livestream URL) — a scheme
 * check `z.string().url()` alone does not perform. Only `http:`/`https:` are
 * legitimate for a link visitors click.
 *
 * No `URL` constructor here — this package stays runtime-agnostic (no DOM /
 * Node ambient types), so the scheme is read directly off the string. Per
 * RFC 3986 a scheme is `[a-zA-Z][a-zA-Z0-9+.-]*` followed by `:`; anything
 * without a recognised `http`/`https` scheme prefix (case-insensitively) is
 * rejected, including a scheme-relative `//host` or a bare `host/path`.
 */
export function isSafeHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value.trim());
}
