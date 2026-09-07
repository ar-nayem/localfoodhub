import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const name: string | undefined = body?.name;
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const location = await prisma.location.create({
    data: { name, slug: slugify(name), description: body?.description || "" },
  });
  return NextResponse.json(location, { status: 201 });
}
