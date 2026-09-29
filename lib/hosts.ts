// Which of the three Android apps a request belongs to.
//
// One Next.js server answers on three hostnames. The customer app lives on
// NEXT_PUBLIC_BASE_URL; the shop-owner app ("Business") lives on NEXT_PUBLIC_BUSINESS_URL;
// the admin app lives on NEXT_PUBLIC_ADMIN_URL.
// Separate hostnames rather than separate paths because that is what makes them distinct
// apps: browser cookies are per host, so a signed-in customer session and a signed-in
// shop session never mix; and Android verifies app-link ownership per host, so the three
// Play Store apps never fight over the same links.
//
// Unconfigured surfaces never match a host. Unknown hosts default to customer, so this
// can ship ahead of the DNS/SSL work without changing single-host deployments.
//
// Deliberately free of imports: middleware.ts runs on the Edge runtime and pulls this in.
// NEXT_PUBLIC_* values are inlined at build time, so changing them needs a rebuild.

export type AppSurface = "customer" | "business" | "admin";

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

/** Public origin of the admin site, or null when it is unconfigured. */
export const ADMIN_ORIGIN = originOf(process.env.NEXT_PUBLIC_ADMIN_URL);

const hostBySurface: Record<AppSurface, string | null> = {
  customer: CUSTOMER_ORIGIN ? new URL(CUSTOMER_ORIGIN).host.toLowerCase() : null,
  business: BUSINESS_ORIGIN ? new URL(BUSINESS_ORIGIN).host.toLowerCase() : null,
  admin: ADMIN_ORIGIN ? new URL(ADMIN_ORIGIN).host.toLowerCase() : null,
};

export function classifyHost(host: string | null | undefined): AppSurface {
  const normalized = host?.toLowerCase() ?? "";
  if (hostBySurface.business && normalized === hostBySurface.business) return "business";
  if (hostBySurface.admin && normalized === hostBySurface.admin) return "admin";
  return "customer";
}

export function originFor(surface: AppSurface): string | null {
  return surface === "customer" ? CUSTOMER_ORIGIN : surface === "business" ? BUSINESS_ORIGIN : ADMIN_ORIGIN;
}

/** True when this request's `Host` header is the Business hostname. The header is used
 * rather than `req.url` because behind the production reverse proxy the URL carries the
 * app's internal bind address, not the public name. */
export function isBusinessHost(host: string | null | undefined): boolean {
  return classifyHost(host) === "business";
}

export function isAdminHost(host: string | null | undefined): boolean {
  return classifyHost(host) === "admin";
}
