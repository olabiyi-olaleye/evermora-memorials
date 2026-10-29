import qrcode from "qrcode-generator";

/**
 * Render a QR code for `text` as a self-contained SVG string.
 *
 * Byte mode, error-correction level `M` (~15% recovery — the right balance for
 * a printed funeral programme), automatic version. A 4-module quiet zone is
 * included per the spec. The SVG has no external references and scales cleanly
 * for print.
 */
export function qrSvg(
  text: string,
  opts: { moduleSize?: number; margin?: number; dark?: string; light?: string } = {},
): string {
  const moduleSize = opts.moduleSize ?? 8;
  const margin = opts.margin ?? 4;
  const dark = opts.dark ?? "#111111";
  const light = opts.light ?? "#ffffff";

  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();

  const count = qr.getModuleCount();
  const dim = (count + margin * 2) * moduleSize;

  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col)) continue;
      const x = (col + margin) * moduleSize;
      const y = (row + margin) * moduleSize;
      path += `M${x} ${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" ` +
    `width="${dim}" height="${dim}" shape-rendering="crispEdges" role="img" ` +
    `aria-label="QR code">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/>` +
    `</svg>`
  );
}

/** The QR SVG as a `data:` URI — usable directly as an `<img src>` or an href. */
export function qrDataUri(text: string, opts?: Parameters<typeof qrSvg>[1]): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg(text, opts))}`;
}
