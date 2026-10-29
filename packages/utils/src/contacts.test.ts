import { describe, expect, it } from "vitest";
import { parseEventContacts, telHref } from "./contacts";

describe("parseEventContacts", () => {
  it("keeps well-formed contacts, trimming and nulling an empty phone", () => {
    expect(
      parseEventContacts([
        { name: " Ada Obi ", phone: "08030000001" },
        { name: "Tunde Bello", phone: "  " },
        { name: "Kemi Ade", phone: null },
      ]),
    ).toEqual([
      { name: "Ada Obi", phone: "08030000001" },
      { name: "Tunde Bello", phone: null },
      { name: "Kemi Ade", phone: null },
    ]);
  });

  it("drops malformed entries and non-array values", () => {
    expect(parseEventContacts([{ phone: "1" }, { name: "" }, "x", null, { name: 3 }])).toEqual([]);
    expect(parseEventContacts(null)).toEqual([]);
    expect(parseEventContacts({ name: "A" })).toEqual([]);
  });
});

describe("telHref", () => {
  it("keeps only digits and a leading plus", () => {
    expect(telHref("0803 000 0001")).toBe("tel:08030000001");
    expect(telHref("+234 (803) 000-0001")).toBe("tel:+2348030000001");
  });

  it("returns null when there is nothing to dial", () => {
    expect(telHref(null)).toBeNull();
    expect(telHref("call me")).toBeNull();
  });
});
