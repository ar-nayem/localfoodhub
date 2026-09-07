import { notFound } from "next/navigation";
import QRCodeLib from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSession, isStaffRole } from "@/lib/auth";
import { qrPublicUrl } from "@/lib/qr/token";
import { OrderView } from "@/components/customer/OrderView";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams: { justPaid?: string; verify?: string };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      items: true,
      shop: true,
      table: true,
      deliveryAddress: true,
      payment: true,
      qrCode: true,
    },
  });
  if (!order) notFound();

  const session = await getSession();
  const isOwner = !!session && session.userId === order.customerId;
  const isStaffOfShop = !!session && isStaffRole(session.role) && session.shopIds.includes(order.shopId);

  // Guest orders (customerId null) stay link-accessible without login. An order placed by
  // a signed-in customer is only visible to that customer or staff of the order's shop —
  // never trust the URL alone for ownership (spec Rule 11).
  if (order.customerId && !isOwner && !isStaffOfShop) notFound();

  const isVerifyingStaff = !!searchParams.verify && isStaffOfShop;

  const qrImage = order.qrCode
    ? await QRCodeLib.toDataURL(qrPublicUrl(order.qrCode.token), { width: 320, margin: 2 })
    : null;

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <OrderView
        order={{
          ...order,
          createdAt: order.createdAt.toISOString(),
          pickupTime: order.pickupTime?.toISOString() ?? null,
          cancelledAt: order.cancelledAt?.toISOString() ?? null,
        }}
        qrImage={qrImage}
        justPaid={searchParams.justPaid === "1"}
        isVerifyingStaff={isVerifyingStaff}
      />
    </main>
  );
}
