import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

// Served at /manifest.webmanifest and linked from every page automatically. This is what
// makes the site installable, and what PWABuilder reads to generate the Android package
// for the Play Store — changing `id` or `start_url` after the app is published makes
// Android treat it as a different app, so leave both alone once it's live.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brand.name,
    short_name: brand.appShortName,
    description: brand.subheading,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: brand.backgroundHex,
    theme_color: brand.primaryColorHex,
    lang: "en",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
