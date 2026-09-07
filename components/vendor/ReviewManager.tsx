"use client";

import { useEffect, useState } from "react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  vendorResponse: string | null;
  createdAt: string;
  user: { name: string } | null;
  reviewerName: string | null;
  product: { name: string };
  media: { type: string; url: string }[];
}

type Filter = "all" | "5" | "4" | "3" | "2" | "1" | "photos" | "videos" | "unanswered";

export function ReviewManager() {
  const { shop } = useVendorShop();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    average: number;
    starBreakdown: { star: number; count: number }[];
    withMedia: number;
    unanswered: number;
  } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  useEffect(() => {
    if (!shop) return;
    fetch(`/api/vendor/reviews?shopId=${shop.id}`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews);
        setStats(d.stats);
      });
  }, [shop?.id]);

  async function submitResponse(reviewId: string) {
    if (!responseText.trim()) return;
    const res = await fetch(`/api/reviews/${reviewId}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: responseText }),
    });
    if (!res.ok) {
      toast("Could not save response", "error");
      return;
    }
    const updated = await res.json();
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, vendorResponse: updated.vendorResponse } : r)));
    setResponding(null);
    setResponseText("");
  }

  const filtered = reviews.filter((r) => {
    if (filter === "all") return true;
    if (filter === "photos") return r.media.some((m) => m.type === "IMAGE");
    if (filter === "videos") return r.media.some((m) => m.type === "VIDEO");
    if (filter === "unanswered") return !r.vendorResponse;
    return r.rating === Number(filter);
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Reviews</h1>

      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xl font-bold">{stats.average.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Average rating</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total reviews</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xl font-bold">{stats.withMedia}</p>
            <p className="text-xs text-muted-foreground">With photos/video</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-xl font-bold">{stats.unanswered}</p>
            <p className="text-xs text-muted-foreground">Unanswered</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {(["all", "5", "4", "3", "2", "1", "photos", "videos", "unanswered"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium capitalize",
              filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            {f === "all" ? "All" : ["5", "4", "3", "2", "1"].includes(f) ? `${f} star` : f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">{r.user?.name ?? r.reviewerName ?? "Guest"}</p>
                <p className="text-xs text-muted-foreground">
                  {r.product.name} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <StarRating value={r.rating} readOnly size={14} />
            </div>
            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
            {r.media.length > 0 && (
              <div className="mt-2 flex gap-2">
                {r.media.map((m, i) =>
                  m.type === "VIDEO" ? (
                    <video key={i} src={m.url} className="h-16 w-24 rounded-lg border border-border" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={m.url} alt="" className="h-16 w-16 rounded-lg border border-border object-cover" />
                  )
                )}
              </div>
            )}

            {r.vendorResponse ? (
              <div className="mt-2 rounded-lg bg-muted p-2.5 text-sm">
                <p className="text-xs font-semibold">Your response</p>
                <p className="mt-0.5 text-muted-foreground">{r.vendorResponse}</p>
              </div>
            ) : responding === r.id ? (
              <div className="mt-2">
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={2}
                  placeholder="Thank the customer or address their feedback..."
                />
                <div className="mt-1.5 flex gap-2">
                  <Button size="sm" onClick={() => submitResponse(r.id)}>
                    Post response
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResponding(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setResponding(r.id);
                  setResponseText("");
                }}
                className="mt-2 text-sm font-medium text-primary"
              >
                Respond
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No reviews match this filter.</p>}
      </div>
    </div>
  );
}
