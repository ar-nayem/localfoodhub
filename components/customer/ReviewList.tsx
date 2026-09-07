"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ShieldCheck } from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";
import { cn } from "@/lib/utils";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  tags: string;
  helpfulCount: number;
  vendorResponse: string | null;
  vendorRespondedAt: string | null;
  createdAt: string;
  customerName: string;
  productName: string;
  media: { type: string; url: string }[];
}

/** Review summary + list for a product or a shop (spec Section 211/234). Sort-only for
 * this pass — the spec's fuller filter set (rating buckets, photos-only, verified-only)
 * is deferred, see README. */
export function ReviewList({
  productId,
  shopId,
  shopName,
}: {
  productId?: string;
  shopId?: string;
  shopName?: string;
}) {
  const [data, setData] = useState<{ reviews: ReviewRow[]; averageRating: number; totalReviews: number } | null>(
    null
  );
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (shopId) params.set("shopId", shopId);
    params.set("sort", sort);
    fetch(`/api/reviews?${params.toString()}`)
      .then((r) => r.json())
      .then(setData);
  }, [productId, shopId, sort]);

  async function vote(reviewId: string) {
    const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
    if (!res.ok) return;
    const { voted } = await res.json();
    setData((prev) =>
      prev
        ? {
            ...prev,
            reviews: prev.reviews.map((r) =>
              r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + (voted ? 1 : -1) } : r
            ),
          }
        : prev
    );
  }

  if (!data) return null;

  const photos = data.reviews.flatMap((r) => r.media.filter((m) => m.type === "IMAGE"));

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(data.averageRating)} readOnly size={16} />
            <span className="text-sm font-semibold">{data.averageRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({data.totalReviews})</span>
          </div>
        </div>
        {data.reviews.length > 0 && (
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
          >
            <option value="newest">Newest</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        )}
      </div>

      {photos.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Customer photos</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.slice(0, 8).map((p) => (
              <button key={p.url} onClick={() => setLightbox(p.url)} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {data.reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Be the first to share your experience.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.reviews.map((r) => (
            <div key={r.id} className="border-b border-border pb-4 last:border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {r.customerName}
                    <span className="flex items-center gap-0.5 text-xs font-normal text-success">
                      <ShieldCheck size={12} /> Verified Purchase
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.productName} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StarRating value={r.rating} readOnly size={14} />
              </div>

              {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}

              {r.media.length > 0 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {r.media.map((m, i) =>
                    m.type === "VIDEO" ? (
                      <video key={i} src={m.url} controls className="h-20 w-32 shrink-0 rounded-lg border border-border" />
                    ) : (
                      <button
                        key={i}
                        onClick={() => setLightbox(m.url)}
                        className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    )
                  )}
                </div>
              )}

              {r.vendorResponse && (
                <div className="mt-2 rounded-lg bg-muted p-2.5 text-sm">
                  <p className="text-xs font-semibold">Response from {shopName ?? "the shop"}</p>
                  <p className="mt-0.5 text-muted-foreground">{r.vendorResponse}</p>
                </div>
              )}

              <button
                onClick={() => vote(r.id)}
                className={cn("mt-2 flex items-center gap-1 text-xs text-muted-foreground")}
              >
                <ThumbsUp size={12} /> Helpful {r.helpfulCount > 0 && r.helpfulCount}
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
