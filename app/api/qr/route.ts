import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole, isStaffRole } from "@/lib/auth";
import { generateQrSchema } from "@/lib/validation/schemas";
import { generateQrToken, qrPublicUrl } from "@/lib/qr/token";
import { defaultTemplateId } from "@/lib/qr/templates/registry";

// Staff (their own shop) or admin (any shop / platform-level types): list QR codes with
// a ready-to-render PNG data URL and basic scan stats (spec Section 4's QR Management
// Center — generate/download/print/enable/disable/scan-stats all read from this row).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (!isStaffRole(session.role) && !isAdminRole(session.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = req.nextUrl.searchParams.get("shopId");
  if (shopId && isStaffRole(session.role) && !isAdminRole(session.role) && !session.shopIds.includes(shopId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const qrCodes = await prisma.qRCode.findMany({
    where: shopId ? { shopId } : isAdminRole(session.role) ? {} : { shopId: { in: session.shopIds } },
    include: { table: true, product: true, location: true, promotion: true },
    orderBy: { createdAt: "desc" },
  });

  const withImages = await Promise.all(
    qrCodes.map(async (qr) => ({
      ...qr,
      url: qrPublicUrl(qr.token),
      imageDataUrl: await QRCode.toDataURL(qrPublicUrl(qr.token), { width: 360, margin: 2 }),
    }))
  );

  return NextResponse.json(withImages);
}

// Staff (own shop) or admin (LOCATION/REGISTRATION or any shop): generate a new QR code.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (!isStaffRole(session.role) && !isAdminRole(session.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = generateQrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid QR request" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.shopId && !isAdminRole(session.role) && !session.shopIds.includes(data.shopId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const qr = await prisma.qRCode.create({
    data: {
      token: generateQrToken(),
      type: data.type,
      label: data.label,
      shopId: data.shopId,
      tableId: data.tableId,
      productId: data.productId,
      locationId: data.locationId,
      orderId: data.orderId,
      templateId: data.templateId ?? defaultTemplateId(data.type),
      ctaOverride: data.ctaOverride,
    },
  });

  return NextResponse.json({
    ...qr,
    url: qrPublicUrl(qr.token),
    imageDataUrl: await QRCode.toDataURL(qrPublicUrl(qr.token), { width: 360, margin: 2 }),
  });
}
