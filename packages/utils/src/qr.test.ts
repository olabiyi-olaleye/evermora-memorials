import { describe, expect, it } from "vitest";
import { qrDataUri, qrSvg } from "./qr";

describe("qrSvg", () => {
  it("produces a self-contained SVG for a URL", () => {
    const svg = qrSvg("https://evermora.com/q/abcdef123456");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<path d=");
    // no external references
    expect(svg).not.toContain("http://www.w3.org/1999/xlink");
    expect(svg).not.toMatch(/href=/);
  });

  it("scales with moduleSize", () => {
    const a = qrSvg("test", { moduleSize: 4 });
    const b = qrSvg("test", { moduleSize: 8 });
    const wa = Number(/width="(\d+)"/.exec(a)![1]);
    const wb = Number(/width="(\d+)"/.exec(b)![1]);
    expect(wb).toBe(wa * 2);
  });

  it("honours custom colours", () => {
    const svg = qrSvg("x", { dark: "#003300", light: "#f0f0f0" });
    expect(svg).toContain('fill="#003300"');
    expect(svg).toContain('fill="#f0f0f0"');
  });

  it("qrDataUri returns an inline image URI", () => {
    const uri = qrDataUri("https://evermora.com/q/deadbeef0000");
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(uri)).toContain("<svg");
  });
});
