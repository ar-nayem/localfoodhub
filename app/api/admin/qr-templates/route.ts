import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/auth";
import { QR_TEMPLATE_LIST } from "@/lib/qr/templates/registry";

/** Admin view: every design including deactivated ones, with its stored state. */
export async function GET() {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.qRTemplate.findMany();
  const known = new Set(existing.map((t) => t.id));
  const missing = QR_TEMPLATE_LIST.filter((t) => !known.has(t.id));
  if (missing.length > 0) {
    await prisma.qRTemplate.createMany({
      data: missing.map((t, i) => ({ id: t.id, name: t.name, type: t.types[0], sortOrder: i })),
    });
  }

  const state = await prisma.qRTemplate.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }] });
  const stateById = new Map(state.map((s) => [s.id, s]));

  return NextResponse.json({
    templates: QR_TEMPLATE_LIST.map((t) => {
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
      };
    }).sort((a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder),
  });
}

/** Activate/deactivate, rename, reorder, or set the default design for a QR type. */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id: string | undefined = body?.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await prisma.qRTemplate.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // Only one default per type — clear the others first so the picker never has two.
  if (body.isDefault === true) {
    await prisma.qRTemplate.updateMany({ where: { type: row.type }, data: { isDefault: false } });
  }

  const updated = await prisma.qRTemplate.update({
    where: { id },
    data: {
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      ...(typeof body.isDefault === "boolean" ? { isDefault: body.isDefault } : {}),
      ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
      ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim().slice(0, 60) } : {}),
      ...(typeof body.previewUrl === "string" ? { previewUrl: body.previewUrl } : {}),
    },
  });

  return NextResponse.json(updated);
}
