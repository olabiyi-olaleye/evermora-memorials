import { describe, expect, it } from "vitest";
import { formatBirthDate, formatClockTime } from "./date";

describe("formatBirthDate", () => {
  it("formats a full date when the day is known", () => {
    expect(formatBirthDate("1948-03-02", false)).toBe("2 March 1948");
  });

  it("shows only the year for a year-only birth date, never 1 January", () => {
    expect(formatBirthDate("1947-01-01", true)).toBe("1947");
  });

  it("returns null for missing or malformed input", () => {
    expect(formatBirthDate(null, true)).toBeNull();
    expect(formatBirthDate("", false)).toBeNull();
    expect(formatBirthDate("nope", true)).toBeNull();
  });
});

describe("formatClockTime", () => {
  it("formats a bare HH:MM", () => {
    expect(formatClockTime("10:00")).toBe("10 am");
    expect(formatClockTime("17:30")).toBe("5:30 pm");
  });

  it("accepts a Postgres time value with seconds", () => {
    expect(formatClockTime("09:05:00")).toBe("9:05 am");
    expect(formatClockTime("00:00:00")).toBe("12 am");
    expect(formatClockTime("12:00:00")).toBe("12 pm");
  });

  it("returns null for missing or malformed input", () => {
    expect(formatClockTime(null)).toBeNull();
    expect(formatClockTime("")).toBeNull();
    expect(formatClockTime("25:00")).toBeNull();
    expect(formatClockTime("nope")).toBeNull();
  });
});
