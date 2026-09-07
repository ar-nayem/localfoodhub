import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { upsertTableSchema } from "@/lib/validation/schemas";
import { generateQrToken } from "@/lib/qr/token";

export async function GET(req: NextRequest) {
  const shopId = req.nextUrl.searchParams.get("shopId");
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const tables = await prisma.table.findMany({
    where: { shopId: shopId! },
    include: { qrCodes: true, orders: { where: { orderStatus: { notIn: ["COMPLETED", "CANCELLED"] } } } },
    orderBy: [{ area: "asc" }, { label: "asc" }],
  });
  return NextResponse.json(tables);
}

// Creating a table also generates its unique TABLE QR in the same call — spec Section 26
// ("Each table gets... Unique QR").
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopId: string | undefined = body?.shopId;
  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const parsed = upsertTableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  const table = await prisma.table.create({
    data: { shopId: shopId!, area: parsed.data.area, label: parsed.data.label },
  });
  const qr = await prisma.qRCode.create({
    data: {
      token: generateQrToken(),
      type: "TABLE",
      shopId: shopId!,
      tableId: table.id,
      label: `Table ${table.label}`,
    },
  });

  return NextResponse.json({ ...table, qrCodes: [qr] }, { status: 201 });
}
