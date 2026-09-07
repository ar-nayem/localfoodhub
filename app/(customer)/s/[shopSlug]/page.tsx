import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShopHeader } from "@/components/customer/ShopHeader";
import { ShopMenu } from "@/components/customer/ShopMenu";
import { ShopThemeProvider } from "@/components/customer/ShopThemeProvider";
import { StorefrontSections } from "@/components/customer/StorefrontSections";
import { defaultSectionsConfig } from "@/lib/storefront/theme";
import { safeJsonParse } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: { shopSlug: string };
  searchParams: { mode?: string; qr?: string; promo?: string; tab?: string };
}) {
  const shop = await prisma.shop.findUnique({
    where: { slug: params.shopSlug },
    include: {
      location: true,
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: { status: { not: "HIDDEN" } },
            orderBy: { sortOrder: "asc" },
            include: { _count: { select: { options: true, addons: true } } },
          },
        },
      },
      promotions: { where: { active: true } },
    },
  });

  if (!shop || shop.status !== "ACTIVE") notFound();

  let dineInTable: { id: string; label: string; area: string } | null = null;
  if (searchParams.mode === "dine-in" && searchParams.qr) {
    const qr = await prisma.qRCode.findUnique({
      where: { token: searchParams.qr },
      include: { table: true },
    });
    if (qr && qr.status === "ACTIVE" && qr.type === "TABLE" && qr.shopId === shop.id && qr.table) {
      dineInTable = { id: qr.table.id, label: qr.table.label, area: qr.table.area };
    }
  }

  const openingHours = safeJsonParse<{ day: string; open: string; close: string }[]>(
    shop.openingHours,
    []
  );

  // Shops that have never touched storefront customization still get a sensible default
  // section layout, rather than showing nothing above the menu.
  const sectionsConfigJson =
    shop.sectionsConfig === "[]" ? JSON.stringify(defaultSectionsConfig()) : shop.sectionsConfig;

  const now = new Date();
  const activePromotions = shop.promotions.filter(
    (p) => (!p.startsAt || now >= p.startsAt) && (!p.endsAt || now <= p.endsAt)
  );
  const featuredProducts = shop.categories
    .flatMap((c) => c.products)
    .filter((p) => p.featured && p.status === "AVAILABLE");

  return (
    <ShopThemeProvider themePreset={shop.themePreset} accentColor={shop.accentColor}>
      <main className="mx-auto max-w-4xl pb-10">
        <ShopHeader
          shop={shop}
          dineInTable={dineInTable}
          openingHours={openingHours}
          bannerText={shop.bannerText}
          bannerCta={shop.bannerCta}
        />
        <StorefrontSections
          sectionsConfigJson={sectionsConfigJson}
          shopSlug={shop.slug}
          description={shop.description}
          featuredProducts={featuredProducts}
          activePromotions={activePromotions}
          openingHours={openingHours}
          address={shop.address}
        />
        <ShopMenu
          shopId={shop.id}
          shopName={shop.name}
          shopSlug={shop.slug}
          categories={shop.categories}
          initialTab={searchParams.tab}
          supportsDelivery={shop.supportsDelivery}
          supportsPickup={shop.supportsPickup}
          dineInTable={dineInTable}
          dineInQrToken={dineInTable ? searchParams.qr! : undefined}
        />
      </main>
    </ShopThemeProvider>
  );
}
