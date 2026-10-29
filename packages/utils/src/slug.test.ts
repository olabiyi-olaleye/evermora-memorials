import { describe, expect, it } from "vitest";
import { isSlugFormat, slugify } from "./slug";
import { clamp, isDefined } from "./guards";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Joseph Olaleye")).toBe("joseph-olaleye");
  });

  it("folds diacritics to ASCII", () => {
    expect(slugify("José Álvaro")).toBe("jose-alvaro");
  });

  it("collapses separators and trims edge hyphens", () => {
    expect(slugify("  --Pa   Joseph!!--  ")).toBe("pa-joseph");
  });

  it("returns an empty string when nothing is slug-safe", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("isSlugFormat", () => {
  it("accepts canonical slugs", () => {
    expect(isSlugFormat("pa-joseph")).toBe(true);
  });

  it("rejects non-canonical or empty input", () => {
    expect(isSlugFormat("Pa Joseph")).toBe(false);
    expect(isSlugFormat("-joseph")).toBe(false);
    expect(isSlugFormat("")).toBe(false);
  });
});

describe("guards", () => {
  it("isDefined narrows nullish values", () => {
    expect([1, null, 2, undefined].filter(isDefined)).toEqual([1, 2]);
  });

  it("clamp bounds a value", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
