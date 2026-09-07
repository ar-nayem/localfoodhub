import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { vendorApplySchema } from "@/lib/validation/schemas";
import { slugify } from "@/lib/utils";

// Public: shop owner registration (spec Section 29). The shop is created with status
// PENDING and stays invisible to customers (see /api/shops filtering on ACTIVE only)
// until an admin approves it — spec Section 29 is the gate the whole marketplace relies
// on to keep unmoderated shops off the public discovery pages.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = vendorApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid application" }, { status: 400 });
  }
  const d = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email: d.email } });
  if (existingUser) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  let slug = slugify(d.shopName);
  let suffix = 0;
  while (await prisma.shop.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugify(d.shopName)}-${suffix}`;
  }

  const owner = await prisma.user.create({
    data: {
      name: d.ownerName,
      email: d.email,
      phone: d.phone,
      passwordHash: await hashPassword(d.password),
      role: "SHOP_OWNER",
    },
  });

  const shop = await prisma.shop.create({
    data: {
      slug,
      name: d.shopName,
      category: d.category,
      description: d.description,
      address: d.address,
      phone: d.phone,
      email: d.email,
      status: "PENDING",
      staff: { create: { userId: owner.id, role: "SHOP_OWNER" } },
    },
  });

  return NextResponse.json({ ok: true, shopId: shop.id }, { status: 201 });
}
