"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

interface FavoriteRow {
  id: string;
  shop?: { slug: string; name: string; category: string } | null;
  product?: { id: string; name: string; price: number; shop: { slug: string; name: string } } | null;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRow[] | null>(null);

  useEffect(() => {
    fetch("/api/favorites").then(async (r) => (r.ok ? setFavorites(await r.json()) : setFavorites([])));
  }, []);

  const shops = favorites?.filter((f) => f.shop) ?? [];
  const products = favorites?.filter((f) => f.product) ?? [];

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <h1 className="mb-4 text-xl font-bold">Favorites</h1>

      {favorites && favorites.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Save your favorite shops for quick ordering.
        </div>
      )}

      {shops.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">My Favorite Shops</h2>
          <div className="flex flex-col gap-2">
            {shops.map((f) => (
              <Link
                key={f.id}
                href={`/s/${f.shop!.slug}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3"
              >
                <Heart size={16} className="fill-primary text-primary" />
                <span className="font-medium">{f.shop!.name}</span>
                <span className="text-sm text-muted-foreground">{f.shop!.category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">My Favorite Food</h2>
          <div className="flex flex-col gap-2">
            {products.map((f) => (
              <Link
                key={f.id}
                href={`/s/${f.product!.shop.slug}/product/${f.product!.id}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3"
              >
                <Heart size={16} className="fill-primary text-primary" />
                <span className="font-medium">{f.product!.name}</span>
                <span className="text-sm text-muted-foreground">{f.product!.shop.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
