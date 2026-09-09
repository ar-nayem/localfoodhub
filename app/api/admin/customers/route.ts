import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, isAdminRole } from "@/lib/auth";
import { bracketForBirthDate } from "@/lib/admin/analytics";

/** RFC 4180 quoting. A name with a comma or a quote in it would otherwise shift every
 * following column, which is how contact exports quietly corrupt themselves. */
function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      createdAt: true,
      addresses: { select: { city: true, label: true }, take: 1, orderBy: { createdAt: "desc" } },
      orders: {
        where: { paymentStatus: "PAID" },
        select: { total: true, createdAt: true, shop: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const leads = customers.map((c) => {
    const totalSpend = c.orders.reduce((sum, o) => sum + o.total, 0);
    const lastOrder = c.orders.reduce<Date | null>(
      (latest, o) => (!latest || o.createdAt > latest ? o.createdAt : latest),
      null
    );
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.addresses[0]?.city ?? null,
      ageBracket: c.dateOfBirth ? bracketForBirthDate(c.dateOfBirth) : null,
      orders: c.orders.length,
      totalSpend,
      averageOrderValue: c.orders.length ? Math.round(totalSpend / c.orders.length) : 0,
      lastOrderAt: lastOrder?.toISOString() ?? null,
      joinedAt: c.createdAt.toISOString(),
    };
  });

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const header = [
      "Name",
      "Email",
      "Phone",
      "City",
      "Age bracket",
      "Orders",
      "Total spend",
      "Avg order value",
      "Last order",
      "Joined",
    ];
    const rows = leads.map((l) =>
      [
        l.name,
        l.email,
        l.phone,
        l.city,
        l.ageBracket,
        l.orders,
        l.totalSpend,
        l.averageOrderValue,
        l.lastOrderAt?.slice(0, 10) ?? "",
        l.joinedAt.slice(0, 10),
      ]
        .map(csvCell)
        .join(",")
    );
    return new NextResponse([header.join(","), ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="localfoodhub-customers-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(leads);
}
