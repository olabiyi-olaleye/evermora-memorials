/**
 * Server-side image validation and light sanitisation — no dependencies, no
 * native code, no external provider (image-transform providers are deferred,
 * see the architecture). Operates on a `Uint8Array` of the uploaded bytes.
 *
 * What it does:
 *   - identifies the real format from magic bytes (never trusts a client MIME)
 *   - rejects anything not in the allow-list
 *   - reads pixel dimensions from the file header
 *   - strips the EXIF (APP1) segment from JPEGs — removes embedded GPS
 *
 * What it does NOT do (deferred to a processing provider): re-encoding,
 * resizing, thumbnails, EXIF stripping for PNG/WebP (those formats rarely
 * carry GPS; PNG `eXIf`/`tEXt` and WebP `EXIF` chunks are a hardening
 * follow-up).
 */

export type DetectedImageFormat = "jpeg" | "png" | "webp" | "gif" | "avif";

export type DetectedImageMime =
  "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";

export interface ImageInspection {
  format: DetectedImageFormat;
  mimeType: DetectedImageMime;
  width: number | null;
  height: number | null;
}

const MIME_BY_FORMAT: Record<DetectedImageFormat, DetectedImageMime> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function bytesMatch(buf: Uint8Array, offset: number, sig: number[]): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[offset + i] !== sig[i]) return false;
  return true;
}

function ascii(buf: Uint8Array, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) s += String.fromCharCode(buf[offset + i] ?? 0);
  return s;
}

/** Identify the image format from its leading bytes, or null if unrecognised. */
export function detectImageFormat(buf: Uint8Array): DetectedImageFormat | null {
  if (bytesMatch(buf, 0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (bytesMatch(buf, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (bytesMatch(buf, 0, [0x47, 0x49, 0x46, 0x38])) return "gif"; // GIF8
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return "webp";
  if (buf.length >= 12 && ascii(buf, 4, 4) === "ftyp") {
    const brand = ascii(buf, 8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
  }
  return null;
}

function readUint16BE(buf: Uint8Array, o: number): number {
  return ((buf[o] ?? 0) << 8) | (buf[o + 1] ?? 0);
}
function readUint32BE(buf: Uint8Array, o: number): number {
  return (
    (buf[o] ?? 0) * 0x1000000 +
    (((buf[o + 1] ?? 0) << 16) | ((buf[o + 2] ?? 0) << 8) | (buf[o + 3] ?? 0))
  );
}
function readUint24LE(buf: Uint8Array, o: number): number {
  return (buf[o] ?? 0) | ((buf[o + 1] ?? 0) << 8) | ((buf[o + 2] ?? 0) << 16);
}

/** Best-effort pixel dimensions from the file header. */
export function readImageDimensions(
  buf: Uint8Array,
  format: DetectedImageFormat,
): { width: number; height: number } | null {
  try {
    if (format === "png") {
      // IHDR is the first chunk: 8 sig + 4 len + "IHDR" then width,height (BE).
      if (ascii(buf, 12, 4) !== "IHDR") return null;
      return { width: readUint32BE(buf, 16), height: readUint32BE(buf, 20) };
    }
    if (format === "gif") {
      return {
        width: (buf[6] ?? 0) | ((buf[7] ?? 0) << 8),
        height: (buf[8] ?? 0) | ((buf[9] ?? 0) << 8),
      };
    }
    if (format === "jpeg") {
      let o = 2;
      while (o + 9 < buf.length) {
        if (buf[o] !== 0xff) {
          o++;
          continue;
        }
        const marker = buf[o + 1] ?? 0;
        // SOF0..SOF15 (except DHT=0xC4, DAC=0xCC, RSTn) carry dimensions.
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return { height: readUint16BE(buf, o + 5), width: readUint16BE(buf, o + 7) };
        }
        const segLen = readUint16BE(buf, o + 2);
        if (segLen < 2) return null;
        o += 2 + segLen;
      }
      return null;
    }
    if (format === "webp") {
      const chunk = ascii(buf, 12, 4);
      if (chunk === "VP8 ") {
        return {
          width: readUint16BE_LE(buf, 26) & 0x3fff,
          height: readUint16BE_LE(buf, 28) & 0x3fff,
        };
      }
      if (chunk === "VP8L") {
        const b = readUint32LE(buf, 21);
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
      }
      if (chunk === "VP8X") {
        return { width: readUint24LE(buf, 24) + 1, height: readUint24LE(buf, 27) + 1 };
      }
      return null;
    }
    return null; // avif: header parsing is involved; dimensions optional
  } catch {
    return null;
  }
}

function readUint16BE_LE(buf: Uint8Array, o: number): number {
  return (buf[o] ?? 0) | ((buf[o + 1] ?? 0) << 8);
}
function readUint32LE(buf: Uint8Array, o: number): number {
  return (
    (buf[o] ?? 0) |
    ((buf[o + 1] ?? 0) << 8) |
    ((buf[o + 2] ?? 0) << 16) |
    ((buf[o + 3] ?? 0) * 0x1000000)
  );
}

/**
 * Remove the APP1 (EXIF) marker segment(s) from a JPEG. Returns the input
 * unchanged for non-JPEG or when no APP1 is present. Keeps APP0/JFIF and the
 * image data intact.
 */
export function stripJpegExif(buf: Uint8Array): Uint8Array {
  if (!bytesMatch(buf, 0, [0xff, 0xd8, 0xff])) return buf;
  const out: number[] = [0xff, 0xd8];
  let o = 2;
  while (o + 4 <= buf.length) {
    if (buf[o] !== 0xff) break;
    const marker = buf[o + 1] ?? 0;
    if (marker === 0xda) {
      // Start of Scan — copy the rest verbatim.
      for (let i = o; i < buf.length; i++) out.push(buf[i]!);
      return Uint8Array.from(out);
    }
    const segLen = readUint16BE(buf, o + 2);
    if (segLen < 2 || o + 2 + segLen > buf.length) break;
    const isExif = marker === 0xe1 && ascii(buf, o + 4, 4) === "Exif";
    if (!isExif) {
      for (let i = o; i < o + 2 + segLen; i++) out.push(buf[i]!);
    }
    o += 2 + segLen;
  }
  // If we broke out early, fall back to the original bytes.
  return o >= buf.length ? Uint8Array.from(out) : buf;
}

export interface InspectImageOptions {
  allow?: DetectedImageFormat[];
  maxBytes?: number;
  maxDimension?: number;
}

export type InspectImageResult =
  | { ok: true; inspection: ImageInspection; bytes: Uint8Array }
  | { ok: false; reason: string; message: string };

/**
 * Validate and lightly sanitise an uploaded image. On success returns the
 * (possibly EXIF-stripped) bytes to store and the detected metadata.
 */
export function inspectImage(
  input: Uint8Array,
  opts: InspectImageOptions = {},
): InspectImageResult {
  const allow = opts.allow ?? ["jpeg", "png", "webp", "gif", "avif"];
  const maxBytes = opts.maxBytes ?? 15 * 1024 * 1024;
  const maxDimension = opts.maxDimension ?? 12_000;

  if (input.length === 0) {
    return { ok: false, reason: "empty", message: "The file is empty." };
  }
  if (input.length > maxBytes) {
    return {
      ok: false,
      reason: "too_large",
      message: `That file is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`,
    };
  }

  const format = detectImageFormat(input);
  if (!format || !allow.includes(format)) {
    return {
      ok: false,
      reason: "unsupported_type",
      message: "That file type isn't supported. Please upload a JPEG, PNG, WebP or GIF.",
    };
  }

  const dims = readImageDimensions(input, format);
  if (dims && (dims.width > maxDimension || dims.height > maxDimension)) {
    return {
      ok: false,
      reason: "dimensions_too_large",
      message: `That image is too large (max ${maxDimension}px on a side).`,
    };
  }

  const bytes = format === "jpeg" ? stripJpegExif(input) : input;

  return {
    ok: true,
    inspection: {
      format,
      mimeType: MIME_BY_FORMAT[format],
      width: dims?.width ?? null,
      height: dims?.height ?? null,
    },
    bytes,
  };
}
