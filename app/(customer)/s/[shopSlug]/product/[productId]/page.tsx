import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import { ProductDetail } from "@/components/customer/ProductDetail";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: { shopSlug: string; productId: string };
}) {
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    include: { shop: true, options: { include: { values: true } }, addons: true },
  });

  if (!product || product.shop.slug !== params.shopSlug) notFound();

  return (
    <main className="mx-auto max-w-2xl pb-32">
      <ProductDetail
        product={{
          ...product,
          ingredients: safeJsonParse<string[]>(product.ingredients, []),
          allergens: safeJsonParse<string[]>(product.allergens, []),
          dietaryTags: safeJsonParse<string[]>(product.dietaryTags, []),
        }}
      />
    </main>
  );
}
