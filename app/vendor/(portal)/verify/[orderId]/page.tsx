import { notFound } from "next/navigation";
import { getSession, isStaffRole } from "@/lib/auth";
import { loadOrderView } from "@/lib/orders/view";
import { OrderView } from "@/components/customer/OrderView";

export const dynamic = "force-dynamic";

/**
 * Where an order or pickup QR lands when staff scan it inside the Business app.
 *
 * Staff verification used to be `/orders/[id]?verify=1` on the customer site. That page
 * needs the staff member's session, and on the Business hostname the session lives here —
 * the customer hostname has never seen it. This is the same panel (same <OrderView>, same
 * status API), just served from the host the shop is actually signed in on.
 */
export default async function VerifyOrderPage({ params }: { params: { orderId: string } }) {
  const session = await getSession();
  const loaded = await loadOrderView(params.orderId);
  if (!loaded) notFound();

  // Only staff of the shop that owns the order. Anyone else gets a plain 404 rather than
  // a hint that the order exists.
  const isStaffOfShop =
    !!session && isStaffRole(session.role) && session.shopIds.includes(loaded.raw.shopId);
  if (!isStaffOfShop) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <OrderView order={loaded.view} qrImage={loaded.qrImage} justPaid={false} isVerifyingStaff />
    </div>
  );
}
