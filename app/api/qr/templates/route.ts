import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QR_TEMPLATE_LIST, templatesForType } from "@/lib/qr/templates/registry";

/**
 * Template catalogue. Designs live in code (they are layout, not content); this endpoint
 * merges the admin-controlled state stored in QRTemplate — availability, ordering and the
 * per-type default — over that catalogue, seeding rows on first read so an admin has
 * something to manage without a migration step.
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  const existing = await prisma.qRTemplate.findMany();
  const known = new Set(existing.map((t) => t.id));
  const missing = QR_TEMPLATE_LIST.filter((t) => !known.has(t.id));

  if (missing.length > 0) {
    await prisma.qRTemplate.createMany({
      data: missing.map((t, i) => ({
        id: t.id,
        name: t.name,
        type: t.types[0],
        active: true,
        // First design registered for a type becomes that type's default.
        isDefault: !existing.some((e) => e.type === t.types[0] && e.isDefault) && i === missing.findIndex((m) => m.types[0] === t.types[0]),
        sortOrder: i,
      })),
    });
  }

  const state = await prisma.qRTemplate.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });
  const stateById = new Map(state.map((s) => [s.id, s]));

  const source = type ? templatesForType(type) : QR_TEMPLATE_LIST;
  const templates = source
    .map((t) => {
      const s = stateById.get(t.id);
      return {
        id: t.id,
        name: s?.name ?? t.name,
        type: t.types[0],
        description: t.description,
        active: s?.active ?? true,
        isDefault: s?.isDefault ?? false,
        sortOrder: s?.sortOrder ?? 0,
        previewUrl: s?.previewUrl ?? null,
        print: t.print,
      };
    })
    .filter((t) => t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return NextResponse.json({ templates });
}
