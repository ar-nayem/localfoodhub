// Which of the two Android apps a request belongs to.
//
// One Next.js server answers on two hostnames. The customer app lives on
// NEXT_PUBLIC_BASE_URL; the shop-owner app ("Business") lives on NEXT_PUBLIC_BUSINESS_URL.
// Separate hostnames rather than separate paths because that is what makes them two real
// apps: browser cookies are per host, so a signed-in customer session and a signed-in
// shop session never mix; and Android verifies app-link ownership per host, so the two
// Play Store apps never fight over the same links.
//
// When NEXT_PUBLIC_BUSINESS_URL is unset (local dev, or a deploy that hasn't set up the
// second hostname yet) nothing is split and everything is served from one host exactly as
// before — so this can ship ahead of the DNS/SSL work without changing anything.
//
// Deliberately free of imports: middleware.ts runs on the Edge runtime and pulls this in.
// NEXT_PUBLIC_* values are inlined at build time, so changing either needs a rebuild.

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

/** Public origin of the customer site, e.g. https://shokherkhabar.arnayem.top */
export const CUSTOMER_ORIGIN = originOf(process.env.NEXT_PUBLIC_BASE_URL);

/** Public origin of the shop-owner ("Business") site, or null when the split is off. */
export const BUSINESS_ORIGIN = originOf(process.env.NEXT_PUBLIC_BUSINESS_URL);

const BUSINESS_HOST = BUSINESS_ORIGIN ? new URL(BUSINESS_ORIGIN).host : null;

/** True when this request's `Host` header is the Business hostname. The header is used
 * rather than `req.url` because behind the production reverse proxy the URL carries the
 * app's internal bind address, not the public name. */
export function isBusinessHost(host: string | null | undefined): boolean {
  return !!BUSINESS_HOST && !!host && host.toLowerCase() === BUSINESS_HOST;
}
