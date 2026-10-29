import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Evermora Family Portal",
    short_name: "Evermora Family",
    description: "Manage your family's memorials, stories, tributes, and funeral information.",
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
