import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight Explore analytics (spec Section 136/137) — just event rows, counted where
// needed (vendor Overview shows a simple total). No dashboard, no funnel charts.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const productId: string | undefined = body?.productId;
  const shopId: string | undefined = body?.shopId;
  const action: string | undefined = body?.action;

  if (!productId || !shopId || !["CLICKED", "ORDERED"].includes(action ?? "")) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  await prisma.discoveryEvent.create({ data: { productId, shopId, action: action! } });
  return NextResponse.json({ ok: true });
}
