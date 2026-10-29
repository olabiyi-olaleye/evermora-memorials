import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Evermora",
    short_name: "Evermora",
    description:
      "Evermora — a calm, lasting place to remember. Public memorials, funeral information, and family remembrance.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ea",
    theme_color: "#f6f3ea",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
