// Single source of truth for placeholder branding. Swap these values (and the mark in
// components/brand/Logo.tsx) once the real logo/identity arrives — nothing else in the
// app hard-codes the platform name or tagline. `MAIN_PLATFORM_*` aliases are exported
// alongside `brand` so either naming convention resolves to the same config.
export const brand = {
  name: "Local Food Hub",
  shortName: "Hub",
  tagline: "Good food, right around you.",
  subheading: "Discover local shops, order ahead, and enjoy your food your way.",
  // HSL triple matching app/globals.css's --primary — for the rare raw-HTML context
  // (the QR print window) that can't reach a Tailwind/CSS-var class.
  primaryColorHsl: "152 55% 28%",
};

export const MAIN_PLATFORM_NAME = brand.name;
export const MAIN_PLATFORM_LOGO = "/logo.svg"; // placeholder path — see components/brand/Logo.tsx
export const MAIN_PLATFORM_PRIMARY_COLOR = brand.primaryColorHsl;

// Every branded QR card (spec Section 32-47/97-99) pulls from this — never a vendor's
// own theme. This is what makes a QR unmistakably "an official platform QR" regardless
// of which shop it belongs to.
export const qrBrand = {
  footerText: `Powered by ${brand.name}`,
};
