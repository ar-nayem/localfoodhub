import { getThemePreset, hexToHslTriple } from "@/lib/storefront/theme";

/** Applies a vendor's theme preset/accent as CSS custom properties scoped to THIS
 * wrapper only (spec Section 110/111) — never written to :root, so it can never leak
 * into the marketplace's own nav/checkout/admin UI outside this subtree. */
export function ShopThemeProvider({
  themePreset,
  accentColor,
  children,
}: {
  themePreset: string;
  accentColor: string | null;
  children: React.ReactNode;
}) {
  const preset = getThemePreset(themePreset);
  const primary = (accentColor && hexToHslTriple(accentColor)) || preset.primary;

  return (
    <div style={{ ["--primary" as string]: primary, ["--radius" as string]: preset.radius }}>
      {children}
    </div>
  );
}
