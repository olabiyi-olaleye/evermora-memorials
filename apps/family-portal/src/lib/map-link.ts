import { isShortMapLink, parseMapCoordinates, type Coordinates } from "@evermora/utils";

const MAX_HOPS = 5;
const TIMEOUT_MS = 5000;

/**
 * Expands a Google Maps share link (`maps.app.goo.gl/…`, what the phone app's
 * Share button copies) and reads the pin from where it redirects. The short
 * link itself carries no coordinates; its `Location` header does.
 *
 * Only ever *fetches* the short-link hosts (re-checked on every hop) — each
 * redirect target is parsed, never requested, so this can't be pointed at
 * anything else. Google's EU cookie wall (`consent.google.com`, which a
 * Dublin-region server does hit) carries the real destination in `continue`,
 * so that's unwrapped rather than followed.
 *
 * Returns null when the link leads somewhere without a pin (e.g. a shared
 * text search), and on any network failure — the caller asks the family for
 * a different link rather than erroring.
 */
export async function resolveShortMapLink(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Coordinates | null> {
  let current = url.trim();
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (!isShortMapLink(current)) return null;

    let res: Response;
    try {
      res = await fetchImpl(current, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return null;

    const target = unwrapConsent(new URL(location, current).toString());
    const coords = parseMapCoordinates(target);
    if (coords) return coords;
    current = target;
  }
  return null;
}

function unwrapConsent(target: string): string {
  const u = new URL(target);
  if (u.hostname === "consent.google.com") return u.searchParams.get("continue") ?? target;
  return target;
}
