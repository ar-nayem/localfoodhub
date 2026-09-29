import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { adminBrand, brand, businessBrand } from "@/lib/brand";
import { classifyHost, type AppSurface } from "@/lib/hosts";

// Served at /manifest.webmanifest and linked from every page automatically. This is what
// makes the site installable, and what PWABuilder reads to generate the Android package
// for the Play Store — changing `id` or `start_url` after an app is published makes
// Android treat it as a different app, so leave both alone once it's live.
//
// There are three Android apps and this one file serves all: the answer depends on which
// hostname asked (see lib/hosts.ts). Point PWABuilder at the customer hostname for the
// customer app, the Business hostname for Business, and the Admin hostname for Admin.
// Reading the request makes this route dynamic, which is fine — it's a few hundred bytes.
export default function manifest(): MetadataRoute.Manifest {
  return manifestForSurface(classifyHost(headers().get("host")));
}

export function manifestForSurface(surface: AppSurface): MetadataRoute.Manifest {
  if (surface === "business") return businessManifest();
  if (surface === "admin") return adminManifest();

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

function adminManifest(): MetadataRoute.Manifest {
  const shortcutIcon = [{ src: "/icons/admin/icon-192.png", sizes: "192x192", type: "image/png" }];
  return {
    id: "/",
    name: adminBrand.name,
    short_name: adminBrand.appShortName,
    description: adminBrand.description,
    start_url: adminBrand.startUrl,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: brand.backgroundHex,
    theme_color: brand.primaryColorHex,
    lang: "en",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/admin/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/admin/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/admin/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shops", short_name: "Shops", url: "/admin/shops", icons: shortcutIcon },
      { name: "Locations", short_name: "Locations", url: "/admin/locations", icons: shortcutIcon },
      { name: "Analytics", short_name: "Analytics", url: "/admin/analytics", icons: shortcutIcon },
    ],
  };
}
