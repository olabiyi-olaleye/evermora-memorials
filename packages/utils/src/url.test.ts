import { describe, expect, it } from "vitest";
import { isSafeHttpUrl } from "./url";

describe("isSafeHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isSafeHttpUrl("https://zoom.us/j/123456789")).toBe(true);
    expect(isSafeHttpUrl("http://example.test/stream")).toBe(true);
  });

  it("rejects a javascript: URL", () => {
    expect(isSafeHttpUrl("javascript:alert(document.cookie)")).toBe(false);
  });

  it("rejects data:, vbscript:, and file: URLs", () => {
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeHttpUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(isSafeHttpUrl("not a url")).toBe(false);
  });
});
