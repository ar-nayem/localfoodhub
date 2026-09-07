import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAccess } from "@/lib/vendor/authz";
import { getSession, isAdminRole } from "@/lib/auth";
import { getTemplate } from "@/lib/qr/templates/registry";
import { buildTemplateData, buildPreviewData } from "@/lib/qr/data";
import { renderQrCard } from "@/lib/qr/render";
import { qrPublicUrl } from "@/lib/qr/token";

/**
 * Renders a QR card to SVG. This is the one place the six layers meet, and it keeps them
 * separate: the token comes from the QR row, the code from the generator, the layout from
 * the template registry, the branding from lib/brand, the copy from the vendor's data.
 *
 * Two modes:
 *  - `qrCodeId` renders a saved code with live data.
 *  - `shopId` + `type` renders an unsaved preview for the designer, using a throwaway
 *    sample token so the preview scans like the real thing without minting a code.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const templateId: string | undefined = body.templateId;
  const cta: string | undefined = body.cta;

  if (body.qrCodeId) {
    const qr = await prisma.qRCode.findUnique({
      where: { id: body.qrCodeId },
      select: { id: true, token: true, type: true, shopId: true, templateId: true, ctaOverride: true },
    });
    if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });

    const auth = await requireShopAccess(qr.shopId);
    if ("error" in auth) return auth.error;

    const template = getTemplate(templateId ?? qr.templateId, qr.type);
    if (!template) return NextResponse.json({ error: "No template for this QR type" }, { status: 400 });

    const data = await buildTemplateData(qr.id);
    if (cta) data.cta = cta;

    const svg = await renderQrCard({ template, data, url: qrPublicUrl(qr.token) });
    return NextResponse.json({ svg, template: { id: template.id, name: template.name, print: template.print } });
  }

  const type: string | undefined = body.type;

  // Admin catalogue preview — no shop involved, so it renders with representative sample
  // content purely to show what a design looks like.
  if (body.adminPreview) {
    const session = await getSession();
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const template = getTemplate(templateId, type ?? "SHOP");
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const svg = await renderQrCard({
      template,
      data: {
        shopName: "Sample Shop",
        shopCategory: "Local Food",
        tableLabel: "07",
        productName: "Sample Dish",
        price: "৳280",
        rating: "4.7",
        reviewCount: "320",
        orderNumber: "10482",
        orderStatus: "Ready",
        cta,
      },
      url: qrPublicUrl("sample-preview"),
    });
    return NextResponse.json({ svg, template: { id: template.id, name: template.name, print: template.print } });
  }

  const shopId: string | undefined = body.shopId;
  if (!shopId || !type) {
    return NextResponse.json({ error: "qrCodeId, or shopId and type, are required" }, { status: 400 });
  }

  const auth = await requireShopAccess(shopId);
  if ("error" in auth) return auth.error;

  const template = getTemplate(templateId, type);
  if (!template) return NextResponse.json({ error: "No template for this QR type" }, { status: 400 });

  const data = await buildPreviewData({
    shopId,
    type,
    tableId: body.tableId,
    productId: body.productId,
    orderId: body.orderId,
    cta,
  });

  // Sample destination — a real, scannable code that resolves to the platform's own
  // "this preview isn't a live code" page rather than a half-created QR.
  const svg = await renderQrCard({ template, data, url: qrPublicUrl("preview-sample") });
  return NextResponse.json({ svg, template: { id: template.id, name: template.name, print: template.print } });
}
