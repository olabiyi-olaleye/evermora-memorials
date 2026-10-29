import { describe, expect, it } from "vitest";
import {
  formatCoordinates,
  isShortMapLink,
  mapDirectionsHref,
  mapSearchHref,
  parseMapCoordinates,
} from "./geo";

describe("parseMapCoordinates", () => {
  it("reads bare coordinates", () => {
    expect(parseMapCoordinates("6.4402, 7.4943")).toEqual({ latitude: 6.4402, longitude: 7.4943 });
    expect(parseMapCoordinates(" -33.8568,151.2153 ")).toEqual({
      latitude: -33.8568,
      longitude: 151.2153,
    });
  });

  it("prefers the place marker over the viewport centre", () => {
    const url =
      "https://www.google.com/maps/place/St.+Monica's+Catholic+Church/@6.4410,7.4900,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d6.4402123!4d7.4943456!16s";
    expect(parseMapCoordinates(url)).toEqual({ latitude: 6.440212, longitude: 7.494346 });
  });

  it("falls back to the viewport centre", () => {
    expect(parseMapCoordinates("https://www.google.com/maps/@6.4410,7.49,15z")).toEqual({
      latitude: 6.441,
      longitude: 7.49,
    });
  });

  it("reads coordinate-valued query params (Google and Apple)", () => {
    expect(parseMapCoordinates("https://maps.google.com/?q=6.4402,7.4943")).toEqual({
      latitude: 6.4402,
      longitude: 7.4943,
    });
    expect(
      parseMapCoordinates("https://www.google.com/maps/search/?api=1&query=6.4402%2C7.4943"),
    ).toEqual({ latitude: 6.4402, longitude: 7.4943 });
    expect(parseMapCoordinates("https://maps.apple.com/?ll=6.4402,7.4943&q=Church")).toEqual({
      latitude: 6.4402,
      longitude: 7.4943,
    });
  });

  it("does not mistake an address query for coordinates", () => {
    expect(parseMapCoordinates("https://maps.google.com/?q=12+Cemetery+Road,+Enugu")).toBeNull();
    expect(parseMapCoordinates("https://maps.google.com/?q=12,5+Main+St")).toBeNull();
  });

  it("rejects out-of-range values and plain text", () => {
    expect(parseMapCoordinates("95, 7")).toBeNull();
    expect(parseMapCoordinates("6, 190")).toBeNull();
    expect(parseMapCoordinates("St. Monica's, Enugu")).toBeNull();
    expect(parseMapCoordinates("")).toBeNull();
  });

  it("has nothing to read in a short link", () => {
    expect(parseMapCoordinates("https://maps.app.goo.gl/AbC123xyz")).toBeNull();
  });
});

describe("isShortMapLink", () => {
  it("recognises Google Maps share links only", () => {
    expect(isShortMapLink("https://maps.app.goo.gl/AbC123xyz")).toBe(true);
    expect(isShortMapLink("https://maps.app.goo.gl/AbC123xyz?g_st=iw")).toBe(true);
    expect(isShortMapLink("https://goo.gl/maps/AbC123")).toBe(true);
    expect(isShortMapLink("http://maps.app.goo.gl/AbC123xyz")).toBe(false);
    expect(isShortMapLink("https://maps.app.goo.gl.evil.com/AbC")).toBe(false);
    expect(isShortMapLink("https://bit.ly/AbC")).toBe(false);
  });
});

describe("map links", () => {
  const pin = { latitude: 6.4402, longitude: 7.4943 };

  it("searches the pin when there is one, else the address", () => {
    expect(mapSearchHref(pin, "1 Church Street, Enugu")).toBe(
      "https://www.google.com/maps/search/?api=1&query=6.4402%2C7.4943",
    );
    expect(mapSearchHref(null, "1 Church Street, Enugu")).toBe(
      "https://www.google.com/maps/search/?api=1&query=1%20Church%20Street%2C%20Enugu",
    );
    expect(mapSearchHref(null, null)).toBeNull();
  });

  it("only gives directions to a pin", () => {
    expect(mapDirectionsHref(pin)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=6.4402,7.4943",
    );
    expect(mapDirectionsHref(null)).toBeNull();
  });

  it("formats coordinates compactly", () => {
    expect(formatCoordinates(pin)).toBe("6.4402, 7.4943");
    expect(formatCoordinates({ latitude: -1, longitude: 36.8172 })).toBe("-1, 36.8172");
  });
});
