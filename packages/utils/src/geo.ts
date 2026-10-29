/**
 * A venue's map pin — what a family sets on a funeral event so guests land
 * on the exact gate, not wherever a text search for "12 Cemetery Road,
 * Enugu" happens to resolve (often the wrong end of town, or nowhere).
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

const NUM = String.raw`-?\d{1,3}(?:\.\d+)?`;
const PAIR = new RegExp(String.raw`^\s*(${NUM})\s*,\s*(${NUM})\s*$`);

function toCoordinates(lat: string, lng: string): Coordinates | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  // Matches the database's numeric(9,6) — anything finer is noise anyway.
  return { latitude: round6(latitude), longitude: round6(longitude) };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

/**
 * Reads a pin out of whatever a family pastes: a full Google Maps or Apple
 * Maps link (as copied from the address bar or the app's Share sheet), or
 * bare coordinates like `6.4402, 7.4943`. Returns null when there's no pin
 * in it — including a short `maps.app.goo.gl` link, which has to be expanded
 * server-side first (see {@link isShortMapLink}).
 *
 * In order of trust: `!3d…!4d…` (Google's own marker for the selected place),
 * then a coordinate-valued `q`/`query`/`ll`/`destination`/`daddr`/`sll`
 * param, then `@lat,lng` (the map viewport's centre — near the place, but
 * only the marker is exact).
 *
 * No `URL` constructor — this package stays runtime-agnostic.
 */
export function parseMapCoordinates(input: string): Coordinates | null {
  const raw = input.trim();
  if (!raw) return null;

  const bare = PAIR.exec(raw);
  if (bare) return toCoordinates(bare[1]!, bare[2]!);

  const text = safeDecode(raw);

  const marker = new RegExp(String.raw`!3d(${NUM})!4d(${NUM})`).exec(text);
  if (marker) {
    const c = toCoordinates(marker[1]!, marker[2]!);
    if (c) return c;
  }

  const param = new RegExp(
    String.raw`[?&](?:q|query|ll|destination|daddr|sll)=(?:loc:)?\s*(${NUM})\s*,\s*(${NUM})(?=$|[&#])`,
  ).exec(text);
  if (param) {
    const c = toCoordinates(param[1]!, param[2]!);
    if (c) return c;
  }

  const viewport = new RegExp(String.raw`@(${NUM}),(${NUM})`).exec(text);
  if (viewport) return toCoordinates(viewport[1]!, viewport[2]!);

  return null;
}

/**
 * A Google Maps short link (what the mobile app's Share button produces).
 * It carries no coordinates itself — only the redirect it points to does.
 */
export function isShortMapLink(input: string): boolean {
  return /^https:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?$/i.test(
    input.trim(),
  );
}

/** `6.4402, 7.4943` — the order and precision Google Maps itself uses. */
export function formatCoordinates({ latitude, longitude }: Coordinates): string {
  return `${latitude.toFixed(6).replace(/\.?0+$/, "")}, ${longitude.toFixed(6).replace(/\.?0+$/, "")}`;
}

/**
 * Where a "Map" link should go: the exact pin when the family set one,
 * otherwise a text search for the address (the behaviour before pins).
 */
export function mapSearchHref(
  coords: Coordinates | null,
  placeQuery: string | null,
): string | null {
  const query = coords ? `${coords.latitude},${coords.longitude}` : placeQuery;
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

/**
 * Turn-by-turn directions to the pin. Pin-only on purpose: directions to a
 * text search would confidently route guests to the wrong place.
 */
export function mapDirectionsHref(coords: Coordinates | null): string | null {
  return coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`
    : null;
}
