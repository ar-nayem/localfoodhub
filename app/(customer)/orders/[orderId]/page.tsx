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
  const isVerifyingStaff =
    !!searchParams.verify &&
    !!session &&
    isStaffRole(session.role) &&
    session.shopIds.includes(order.shopId);

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
        }}
        qrImage={qrImage}
        justPaid={searchParams.justPaid === "1"}
        isVerifyingStaff={isVerifyingStaff}
      />
    </main>
  );
}
