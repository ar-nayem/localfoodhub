"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "@/components/ui/Toast";

/** Favorite toggle for a shop or product (spec Section 72). Self-contained: fetches its
 * own initial state so it can drop into any card without the parent list needing to know
 * about favorites at all. */
export function FavoriteHeart({ shopId, productId }: { shopId?: string; productId?: string }) {
  const [favoriteId, setFavoriteId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { id: string; shopId?: string | null; productId?: string | null }[]) => {
        const match = rows.find((f) => (shopId ? f.shopId === shopId : f.productId === productId));
        setFavoriteId(match?.id ?? null);
      })
      .catch(() => setFavoriteId(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (favoriteId === undefined) return;

    if (favoriteId) {
      const prev = favoriteId;
      setFavoriteId(null);
      const res = await fetch(`/api/favorites?id=${prev}`, { method: "DELETE" });
      if (!res.ok) setFavoriteId(prev);
    } else {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, productId }),
      });
      if (res.status === 401) {
        toast("Sign in to save favorites", "info");
        return;
      }
      if (res.ok) setFavoriteId((await res.json()).id);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={favoriteId ? "Remove from favorites" : "Add to favorites"}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur"
    >
      <Heart size={15} className={favoriteId ? "fill-error text-error" : "text-foreground"} />
    </button>
  );
}
