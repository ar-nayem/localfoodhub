import { Logo } from "@/components/brand/Logo";
import { qrBrand } from "@/lib/brand";
import { qrPurpose } from "@/lib/qr/presentation";

/**
 * The platform-branded QR card (spec Section 32-47/97-99): every printed/on-screen QR in
 * the platform renders through this one component, regardless of which shop or vendor
 * theme is involved. It always shows the PLATFORM logo and footer — never a vendor's own
 * branding or accent color — so a customer can trust "this is an official platform QR"
 * on sight. Vendors customize their shop page (ShopThemeProvider); they cannot touch this.
 */
export function QRCard({
  type,
  title,
  subtitle,
  imageDataUrl,
  accentClassName = "border-primary bg-primary/5",
}: {
  type: string;
  title: string;
  subtitle?: string;
  imageDataUrl: string;
  /** Tailwind classes for the card's frame accent — purely cosmetic per QR type (e.g.
   * pickup=orange, delivery=blue), never sourced from a vendor's theme. */
  accentClassName?: string;
}) {
  const purpose = qrPurpose(type);

  return (
    <div className={`flex w-64 flex-col items-center rounded-3xl border-2 bg-surface p-5 text-center shadow-sm ${accentClassName}`}>
      <Logo iconOnly={false} className="text-sm" />
      <p className="mt-3 text-base font-bold leading-tight">{title}</p>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

      <div className="mt-4 rounded-2xl bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageDataUrl} alt={`QR code — ${purpose.cta}`} className="h-40 w-40" />
      </div>

      <p className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        {purpose.cta}
      </p>
      {purpose.sub && <p className="mt-1.5 text-xs text-muted-foreground">{purpose.sub}</p>}

      <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
        {qrBrand.footerText}
      </p>
    </div>
  );
}
