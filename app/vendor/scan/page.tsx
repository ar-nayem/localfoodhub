import { QrScanner } from "@/components/customer/QrScanner";

/**
 * Staff-side entry point to the same scanner/resolver the customer app uses (spec Section
 * 58) — scanning an ORDER or PICKUP QR here still lands on the order's own page with the
 * staff verification panel and "Mark Collected" action, since that's resolved server-side
 * in app/q/[token]/route.ts based on who's signed in, not on which screen opened the
 * camera. This page just gives staff a reachable button for it inside the dashboard,
 * instead of only working if they already knew the /scan URL.
 */
export default function VendorScanPage() {
  return (
    <QrScanner
      heading="Scan to Verify"
      subtitle="Scan an order or pickup QR to verify it, or a table/shop QR to check where it leads."
    />
  );
}
