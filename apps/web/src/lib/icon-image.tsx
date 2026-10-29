import { ImageResponse } from "next/og";

/**
 * PWA / favicon icons, generated at build time (no static asset files) — an
 * evergreen "E" monogram matching `@evermora/ui`'s brand tokens
 * (`--color-brand: #2f5a4c`, `--color-on-brand: #f6f3ea`). Swap for a real
 * mark whenever one exists; every icon route (`icon.tsx`, `apple-icon.tsx`,
 * `icon-192/route.tsx`, …) calls this one renderer.
 */
export function renderIcon(size: number, opts: { maskable?: boolean } = {}) {
  // A maskable icon needs safe-area padding — platforms may crop to a circle.
  const padding = opts.maskable ? size * 0.16 : size * 0.08;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2f5a4c",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: size - padding * 2,
          height: size - padding * 2,
          fontSize: (size - padding * 2) * 0.62,
          fontWeight: 600,
          color: "#f6f3ea",
          fontFamily: "sans-serif",
        }}
      >
        E
      </div>
    </div>,
    { width: size, height: size },
  );
}
