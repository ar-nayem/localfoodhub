import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Locations are read at request time. Without this, Next attempts to execute this
// database-backed handler while generating the production bundle.
export const dynamic = "force-dynamic";

export async function GET() {
  const locations = await prisma.location.findMany({
    include: { _count: { select: { shops: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(locations);
}
