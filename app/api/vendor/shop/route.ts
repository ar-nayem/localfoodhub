import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaffRole } from "@/lib/auth";

// Returns the current staff session's primary shop (this pass assumes one shop per
// owner — spec's future multi-branch/Brand->Branch structure is a follow-up, the schema
// already supports a staff member belonging to more than one ShopStaff row).
export async function GET() {
  const session = await getSession();
  if (!session || !isStaffRole(session.role) || session.shopIds.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const shop = await prisma.shop.findUnique({ where: { id: session.shopIds[0] } });
  return NextResponse.json(shop);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SHOP_OWNER" || session.shopIds.length === 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const shopId = session.shopIds[0];
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
      ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl } : {}),
      ...(body.supportsDelivery !== undefined ? { supportsDelivery: body.supportsDelivery } : {}),
      ...(body.supportsPickup !== undefined ? { supportsPickup: body.supportsPickup } : {}),
      ...(body.supportsDineIn !== undefined ? { supportsDineIn: body.supportsDineIn } : {}),
      ...(body.deliveryFee !== undefined ? { deliveryFee: body.deliveryFee } : {}),
      ...(body.minOrder !== undefined ? { minOrder: body.minOrder } : {}),
      ...(body.prepTimeMinutes !== undefined ? { prepTimeMinutes: body.prepTimeMinutes } : {}),
    },
  });
  return NextResponse.json(updated);
}
