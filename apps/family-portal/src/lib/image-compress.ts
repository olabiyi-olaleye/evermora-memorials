/**
 * Client-side image compression — resizes and re-encodes a photo in the
 * browser before it's uploaded, so a phone camera's 8-12 MB original doesn't
 * have to travel the network at full size. Runs entirely on `<canvas>`, no
 * dependency. Browser-only — deliberately not in `@evermora/utils`, which
 * stays Node-safe for server-side imports.
 *
 * This is a bandwidth/speed optimisation, not the security boundary — the
 * server still authoritatively re-validates (magic bytes, dimensions, EXIF
 * strip) whatever bytes actually land in storage, exactly as before.
 */

const MAX_DIMENSION = 2560; // longest edge, px — generous for a gallery/hero view
const JPEG_QUALITY = 0.85;
/** Below this, compression isn't worth the CPU cost or quality loss. */
const SKIP_BELOW_BYTES = 400 * 1024;

/** GIFs are passed through — re-encoding via canvas would flatten animation. */
function shouldCompress(file: File): boolean {
  return file.type !== "image/gif" && file.size > SKIP_BELOW_BYTES;
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function targetSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) return { width, height };
  const scale = MAX_DIMENSION / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Compress one image file for upload. Falls back to the original file
 * whenever compression isn't applicable, isn't supported by the browser, or
 * doesn't actually end up smaller.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!shouldCompress(file) || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await loadBitmap(file);
    const { width, height } = targetSize(bitmap.width, bitmap.height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^./\\]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Any failure (unsupported format, decode error) — upload the original;
    // the server-side validation is the real gate, this is best-effort.
    return file;
  }
}
