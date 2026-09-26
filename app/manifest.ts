import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { brand, businessBrand } from "@/lib/brand";
import { isBusinessHost } from "@/lib/hosts";

// Served at /manifest.webmanifest and linked from every page automatically. This is what
// makes the site installable, and what PWABuilder reads to generate the Android package
// for the Play Store — changing `id` or `start_url` after an app is published makes
// Android treat it as a different app, so leave both alone once it's live.
//
// There are two Android apps and this one file serves both: the answer depends on which
// hostname asked (see lib/hosts.ts). Point PWABuilder at the customer hostname for the
// customer app and at the Business hostname for the Business app. Reading the request
// makes this route dynamic, which is fine — it's a few hundred bytes.
export default function manifest(): MetadataRoute.Manifest {
  if (isBusinessHost(headers().get("host"))) return businessManifest();

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

function businessManifest(): MetadataRoute.Manifest {
  const shortcutIcon = [{ src: "/icons/business/icon-192.png", sizes: "192x192", type: "image/png" }];
  return {
    id: "/",
    name: businessBrand.name,
    short_name: businessBrand.appShortName,
    description: businessBrand.description,
    start_url: businessBrand.startUrl,
    scope: "/",
    display: "standalone",
    // Unlike the customer app this one is also run on a counter tablet as a kitchen
    // display, so it must not be pinned to portrait.
    orientation: "any",
    background_color: brand.backgroundHex,
    theme_color: brand.primaryColorHex,
    lang: "en",
    categories: ["business", "food", "productivity"],
    icons: [
      { src: "/icons/business/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/business/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/business/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon for the three things staff open most.
    shortcuts: [
      { name: "Orders", short_name: "Orders", url: "/vendor/orders", icons: shortcutIcon },
      { name: "Kitchen display", short_name: "Kitchen", url: "/vendor/kitchen", icons: shortcutIcon },
      { name: "Scan to verify", short_name: "Scan", url: "/vendor/scan", icons: shortcutIcon },
    ],
  };
}
