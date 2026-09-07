// Vendor storefront theming (spec Section 110/111). Presets only change how a shop's OWN
// page looks — applied as CSS custom properties scoped to a wrapper around the shop page
// tree (components/customer/ShopThemeProvider.tsx), never written to the global :root, so
// a vendor's theme can never touch the marketplace's own navigation/checkout/admin UI.

export interface ThemePreset {
  key: string;
  label: string;
  primary: string; // HSL triple, e.g. "14 80% 52%" — matches the app's --primary format
  radius: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { key: "classic", label: "Classic", primary: "152 55% 28%", radius: "16px" }, // platform default green
  { key: "fresh", label: "Fresh", primary: "142 60% 40%", radius: "16px" },
  { key: "modern", label: "Modern", primary: "215 70% 50%", radius: "10px" },
  { key: "warm", label: "Warm", primary: "30 85% 50%", radius: "20px" },
  { key: "minimal", label: "Minimal", primary: "20 15% 20%", radius: "6px" },
  { key: "bold", label: "Bold", primary: "330 75% 48%", radius: "16px" },
];

export function getThemePreset(key: string): ThemePreset {
  return THEME_PRESETS.find((t) => t.key === key) ?? THEME_PRESETS[0];
}

/** Rejects custom accent colors that would make white button text unreadable (spec
 * Section 111 — "do not allow vendors to select colors that make text unreadable"). Takes
 * a #rrggbb hex, returns true if it's dark/saturated enough to safely carry white text. */
export function isAccentColorSafe(hex: string): boolean {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return false;
  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);
  // Relative luminance (WCAG-ish approximation) — reject pale colors where white text on
  // top would fail contrast.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance <= 0.72;
}

export function hexToHslTriple(hex: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const r = parseInt(match[1].slice(0, 2), 16) / 255;
  const g = parseInt(match[1].slice(2, 4), 16) / 255;
  const b = parseInt(match[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Optional storefront sections a vendor can show/hide/reorder above the always-present
// menu (spec Section 112). "menu" itself is intentionally not in this list — the core
// ordering flow is marketplace-owned, not vendor-hideable (spec Section 139).
export const STOREFRONT_SECTIONS = [
  { key: "hero", label: "Hero Banner" },
  { key: "todaysSpecial", label: "Today's Special" },
  { key: "featured", label: "Featured Items" },
  { key: "about", label: "About" },
  { key: "hours", label: "Opening Hours" },
] as const;
export type StorefrontSectionKey = (typeof STOREFRONT_SECTIONS)[number]["key"];

export interface SectionConfig {
  key: StorefrontSectionKey;
  visible: boolean;
  order: number;
}

export function defaultSectionsConfig(): SectionConfig[] {
  return STOREFRONT_SECTIONS.map((s, i) => ({ key: s.key, visible: true, order: i }));
}
