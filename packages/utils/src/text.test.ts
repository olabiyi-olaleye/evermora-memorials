import { describe, expect, it } from "vitest";
import {
  funeralPlaceholderCopy,
  initialsOf,
  sanitizeLine,
  sanitizePlainText,
  truncateWords,
} from "./text";

const zwsp = String.fromCharCode(0x200b);
const rlo = String.fromCharCode(0x202e);
const nul = String.fromCharCode(0);

describe("sanitizePlainText", () => {
  it("strips HTML-looking tags", () => {
    expect(sanitizePlainText("Hello <b>world</b> <script>x</script>")).toBe("Hello world x");
  });

  it("removes zero-width and bidi-override characters", () => {
    expect(sanitizePlainText(`he${zwsp}llo${rlo}world`)).toBe("helloworld");
  });

  it("keeps newlines and tabs but drops other control chars", () => {
    expect(sanitizePlainText(`a${nul}b\tc\nd`)).toBe("ab\tc\nd");
  });

  it("normalises newlines and collapses blank runs", () => {
    expect(sanitizePlainText("one\r\n\r\n\r\n\r\ntwo   \n  ")).toBe("one\n\ntwo");
  });

  it("trims", () => {
    expect(sanitizePlainText("   spaced   ")).toBe("spaced");
  });
});

describe("sanitizeLine", () => {
  it("collapses all internal whitespace", () => {
    expect(sanitizeLine("  Grace   \n  Nnamdi  ")).toBe("Grace Nnamdi");
  });
});

describe("truncateWords", () => {
  it("returns the text unchanged when it's within the limit", () => {
    expect(truncateWords("A short line.", 70)).toEqual({
      excerpt: "A short line.",
      truncated: false,
    });
  });

  it("cuts at a word boundary and appends an ellipsis when over the limit", () => {
    const text = Array.from({ length: 10 }, (_, i) => `word${i}`).join(" ");
    expect(truncateWords(text, 4)).toEqual({
      excerpt: "word0 word1 word2 word3…",
      truncated: true,
    });
  });

  it("trims surrounding whitespace either way", () => {
    expect(truncateWords("  padded  ", 70).excerpt).toBe("padded");
  });
});

describe("funeralPlaceholderCopy", () => {
  it("gives 'not_started' and 'planning' the same reassurance", () => {
    expect(funeralPlaceholderCopy("not_started")).toBe(funeralPlaceholderCopy("planning"));
    expect(funeralPlaceholderCopy("not_started")).toMatch(/being planned/i);
  });

  it("distinguishes partially confirmed and confirmed", () => {
    expect(funeralPlaceholderCopy("partially_confirmed")).toMatch(/some funeral details/i);
    expect(funeralPlaceholderCopy("confirmed")).toMatch(/confirmed and will appear/i);
  });

  it("shows nothing once the funeral is marked completed", () => {
    expect(funeralPlaceholderCopy("completed")).toBeNull();
  });
});

describe("initialsOf", () => {
  it("takes the first letter of the first and last words", () => {
    expect(initialsOf("Josephine Adaeze Okafor")).toBe("JO");
  });

  it("falls back to one initial for a single-word name", () => {
    expect(initialsOf("Cher")).toBe("C");
  });

  it("ignores extra whitespace", () => {
    expect(initialsOf("  Grace   Nnamdi  ")).toBe("GN");
  });
});
