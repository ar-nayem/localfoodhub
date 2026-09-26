import { notFound } from "next/navigation";
import { getSession, isStaffRole } from "@/lib/auth";
import { loadOrderView } from "@/lib/orders/view";
import { OrderView } from "@/components/customer/OrderView";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams: { justPaid?: string; verify?: string };
}) {
  const loaded = await loadOrderView(params.orderId);
  if (!loaded) notFound();
  const { raw: order, view, qrImage } = loaded;

  const session = await getSession();
  const isOwner = !!session && session.userId === order.customerId;
  const isStaffOfShop = !!session && isStaffRole(session.role) && session.shopIds.includes(order.shopId);

  // Guest orders (customerId null) stay link-accessible without login. An order placed by
  // a signed-in customer is only visible to that customer or staff of the order's shop —
  // never trust the URL alone for ownership (spec Rule 11).
  if (order.customerId && !isOwner && !isStaffOfShop) notFound();

  const isVerifyingStaff = !!searchParams.verify && isStaffOfShop;

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <OrderView
        order={view}
        qrImage={qrImage}
        justPaid={searchParams.justPaid === "1"}
        isVerifyingStaff={isVerifyingStaff}
      />
    </main>
  );
}
