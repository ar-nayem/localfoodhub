// Layer 4 of the QR system, and the single source of truth for branding everywhere else.
// The name is final (শখের খাবার / "shokherkhabar"); the mark in components/brand/Logo.tsx
// is still a monogram placeholder until a real logo arrives. Nothing else in the app
// hard-codes the platform name, tagline or brand colour. `MAIN_PLATFORM_*` aliases are
// exported alongside `brand` so either naming convention resolves to the same config.
//
// `name`/`shortName`/`tagline` are Bengali script — real UI text, not a technical
// identifier. Everywhere the app needs an ASCII token instead (package.json, the demo
// email domain, cookie/storage keys, the Android package name) uses the literal slug
// "shokherkhabar", set independently at each of those call sites, never derived from
// `name` — you cannot slugify Bengali script into ASCII automatically without guessing at
// a transliteration.
//
// QR card templates read these values through the renderer and cannot override them: a
// vendor customises layout and copy, never the platform's own identity on a QR.
function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}

export const brand = {
  name: "শখের খাবার",
  shortName: "শখের খাবার",
  tagline: "তৃপ্তি। কোয়ালিটি। বিশুদ্ধতা",
  subheading: "Discover local shops, order ahead, and enjoy your food your way.",
  /** Short line printed under the wordmark on QR cards. */
  qrTagline: "তৃপ্তি। কোয়ালিটি। বিশুদ্ধতা",
  // HSL triple matching app/globals.css's --primary — for the rare raw-HTML context
  // (the QR print window) that can't reach a Tailwind/CSS-var class.
  primaryColorHsl: "152 55% 28%",
  // Hex equivalents, needed wherever colour is written into SVG/canvas rather than CSS.
  primaryColorHex: "#20693F",
  primaryColorDarkHex: "#14472A",
  /** Domain shown on printed cards so a scanner knows where the code leads — the host the
   * codes actually resolve to, never a placeholder: printing a domain the platform doesn't
   * own would send anyone who types it somewhere else entirely. */
  domain: hostOf(process.env.NEXT_PUBLIC_BASE_URL) ?? "shokherkhabar.arnayem.top",
  /** Home-screen label under the installed app icon. Launchers truncate past ~12
   * (Latin-equivalent) characters; "শখের খাবার" is two short words, so it matches `name`. */
  appShortName: "শখের খাবার",
  /** Splash-screen ground while the installed app boots — matches --background. */
  backgroundHex: "#FAF8F4",
  /** The privacy contact printed on /privacy, /terms and /delete-account. App stores
   * require a working address here — this one is public, so swap it for a dedicated
   * support inbox once one exists. */
  supportEmail: "nayem3622@gmail.com",
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
