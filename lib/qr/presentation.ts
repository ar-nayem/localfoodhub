// Per-QR-type display copy for the branded QR card (spec Section 34/35) — every QR
// shares the same platform logo/frame/footer (components/qr/QRCard.tsx); only this
// contextual purpose line and icon change.
export const QR_PURPOSE: Record<string, { cta: string; sub: string }> = {
  SHOP: { cta: "Scan to View Shop", sub: "Visit our digital storefront" },
  MENU: { cta: "Scan to View Menu", sub: "Explore our delicious food" },
  TABLE: { cta: "Scan to Order", sub: "Dine-in • Easy • Contactless" },
  COUNTER: { cta: "Scan to Order", sub: "Pickup made easy" },
  PRODUCT: { cta: "Scan to View Food", sub: "See this item's details" },
  ORDER: { cta: "Scan to Verify Order", sub: "Order status & details" },
  PICKUP: { cta: "Scan to Verify Pickup", sub: "Skip the line. Pick up with ease." },
  DELIVERY: { cta: "Scan to Verify Delivery", sub: "Safe delivery, happy meals" },
  PROMOTION: { cta: "Scan to Claim Offer", sub: "A little something for you" },
  LOCATION: { cta: "Explore Food Here", sub: "Discover shops in this area" },
  REGISTRATION: { cta: "Scan to Join", sub: "Bring your shop online" },
};

export function qrPurpose(type: string) {
  return QR_PURPOSE[type] ?? { cta: "Scan to Continue", sub: "" };
}
