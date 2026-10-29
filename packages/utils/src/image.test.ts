import { describe, expect, it } from "vitest";
import { detectImageFormat, inspectImage, readImageDimensions, stripJpegExif } from "./image";

/** 8-byte PNG signature + IHDR chunk declaring width/height. */
function pngHeader(w: number, h: number): Uint8Array {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  b.set([0, 0, 0, 13], 8); // IHDR length
  b.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
}

/** Minimal, self-consistent JPEG: SOI, APP1(Exif), SOF0 (1 component), SOS. */
function jpegWithExif(w: number, h: number): Uint8Array {
  const exif = [0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
  const sof = [
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    (h >> 8) & 0xff,
    h & 0xff,
    (w >> 8) & 0xff,
    w & 0xff,
    0x01,
    0x01,
    0x11,
    0x00,
  ];
  return Uint8Array.from([0xff, 0xd8, ...exif, ...sof, 0xff, 0xda, 0x00, 0x02]);
}

function includesAscii(buf: Uint8Array, text: string): boolean {
  const sig = [...text].map((c) => c.charCodeAt(0));
  outer: for (let i = 0; i + sig.length <= buf.length; i++) {
    for (let j = 0; j < sig.length; j++) if (buf[i + j] !== sig[j]) continue outer;
    return true;
  }
  return false;
}

describe("detectImageFormat", () => {
  it("identifies formats from magic bytes", () => {
    expect(detectImageFormat(pngHeader(1, 1))).toBe("png");
    expect(detectImageFormat(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectImageFormat(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe("gif");
  });

  it("rejects an unknown / spoofed file", () => {
    expect(detectImageFormat(Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull(); // PE/EXE
    expect(detectImageFormat(Uint8Array.from([0x3c, 0x3f, 0x78, 0x6d, 0x6c]))).toBeNull(); // "<?xml"
  });
});

describe("readImageDimensions", () => {
  it("reads PNG dimensions", () => {
    expect(readImageDimensions(pngHeader(800, 600), "png")).toEqual({ width: 800, height: 600 });
  });
  it("reads JPEG dimensions from SOF0", () => {
    expect(readImageDimensions(jpegWithExif(1024, 768), "jpeg")).toEqual({
      width: 1024,
      height: 768,
    });
  });
});

describe("stripJpegExif", () => {
  it("removes the APP1 Exif segment", () => {
    const withExif = jpegWithExif(10, 10);
    const stripped = stripJpegExif(withExif);
    expect(stripped.length).toBeLessThan(withExif.length);
    expect(includesAscii(withExif, "Exif")).toBe(true);
    expect(includesAscii(stripped, "Exif")).toBe(false);
    expect(detectImageFormat(stripped)).toBe("jpeg");
    expect(readImageDimensions(stripped, "jpeg")).toEqual({ width: 10, height: 10 });
  });
  it("leaves a non-JPEG untouched", () => {
    const png = pngHeader(1, 1);
    expect(stripJpegExif(png)).toBe(png);
  });
});

describe("inspectImage", () => {
  it("accepts a PNG within limits and returns metadata", () => {
    const res = inspectImage(pngHeader(200, 200));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.inspection).toMatchObject({ format: "png", mimeType: "image/png", width: 200 });
    }
  });

  it("rejects a file whose real bytes are not an image", () => {
    const res = inspectImage(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d])); // "%PDF-"
    expect(res).toMatchObject({ ok: false, reason: "unsupported_type" });
  });

  it("rejects an oversized file", () => {
    const big = new Uint8Array(20 * 1024 * 1024);
    big.set(pngHeader(1, 1));
    expect(inspectImage(big, { maxBytes: 15 * 1024 * 1024 })).toMatchObject({
      ok: false,
      reason: "too_large",
    });
  });

  it("rejects an over-large image dimension", () => {
    expect(inspectImage(pngHeader(50_000, 50_000), { maxDimension: 12_000 })).toMatchObject({
      ok: false,
      reason: "dimensions_too_large",
    });
  });

  it("strips EXIF from an accepted JPEG", () => {
    const res = inspectImage(jpegWithExif(100, 100), { allow: ["jpeg"] });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(includesAscii(res.bytes, "Exif")).toBe(false);
    }
  });
});
