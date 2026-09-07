import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isStaffRole } from "@/lib/auth";

// Vendor responds to a review — staff of that shop only, and only a response (spec
// Section 224 is explicit: vendors cannot edit the customer's own rating/text).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const review = await prisma.review.findUnique({ where: { id: params.id } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!session.shopIds.includes(review.shopId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const response = typeof body?.response === "string" ? body.response.trim().slice(0, 1000) : "";
  if (!response) return NextResponse.json({ error: "Response can't be empty" }, { status: 400 });

  const updated = await prisma.review.update({
    where: { id: params.id },
    data: { vendorResponse: response, vendorRespondedAt: new Date() },
  });
  return NextResponse.json(updated);
}
