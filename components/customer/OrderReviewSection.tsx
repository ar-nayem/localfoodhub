"use client";

import { useEffect, useState } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { ReviewComposer } from "./ReviewComposer";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import type { ReviewMediaItem } from "./ReviewMediaPicker";

interface OrderItemRow {
  id: string;
  name: string;
}

interface MyReview {
  id: string;
  orderItemId: string;
  rating: number;
  comment: string | null;
  tags: string;
  media: ReviewMediaItem[];
}

const EXPERIENCE_LABEL: Record<string, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup experience",
  DINE_IN: "Service",
};

/** "How was your food?" (spec Section 192/193) — appears on a completed order, one
 * review per item plus an optional overall-experience rating. Never interrupts the
 * customer elsewhere; this is the only prompt, and it's revisitable any time from the
 * order's own page. */
export function OrderReviewSection({
  orderId,
  orderType,
  items,
}: {
  orderId: string;
  orderType: string;
  items: OrderItemRow[];
}) {
  const [myReviews, setMyReviews] = useState<MyReview[] | null>(null);
  const [composerItem, setComposerItem] = useState<OrderItemRow | null>(null);
  const [experienceRating, setExperienceRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [experienceComment, setExperienceComment] = useState("");
  const [experienceSaved, setExperienceSaved] = useState(false);
  const [savingExperience, setSavingExperience] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/mine?orderId=${orderId}`)
      .then((r) => r.json())
      .then((d) => setMyReviews(d.reviews ?? []));
  }, [orderId]);

  function reviewFor(itemId: string) {
    return myReviews?.find((r) => r.orderItemId === itemId);
  }

  async function submitExperience() {
    if (experienceRating === 0) return;
    setSavingExperience(true);
    const res = await fetch(`/api/orders/${orderId}/experience`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experienceRating,
        serviceRating: serviceRating || undefined,
        experienceComment: experienceComment || undefined,
      }),
    });
    setSavingExperience(false);
    if (!res.ok) {
      toast("Could not save", "error");
      return;
    }
    setExperienceSaved(true);
    toast("Thanks for the feedback!", "success");
  }

  if (myReviews === null) return null;

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold">How was your food?</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const existing = reviewFor(item.id);
          return (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
              <div>
                <p className="text-sm font-medium">{item.name}</p>
                {existing && <StarRating value={existing.rating} readOnly size={14} />}
              </div>
              <button
                onClick={() => setComposerItem(item)}
                className="text-sm font-medium text-primary"
              >
                {existing ? "Edit review" : "Rate this item"}
              </button>
            </div>
          );
        })}
      </div>

      {!experienceSaved ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Overall experience</p>
          <StarRating value={experienceRating} onChange={setExperienceRating} />
          {orderType !== "DINE_IN" || true ? (
            <div className="mt-2">
              <p className="mb-1 text-xs text-muted-foreground">{EXPERIENCE_LABEL[orderType] ?? "Experience"}</p>
              <StarRating value={serviceRating} onChange={setServiceRating} size={16} />
            </div>
          ) : null}
          <Textarea
            className="mt-2"
            rows={2}
            placeholder="Anything else? (optional)"
            value={experienceComment}
            onChange={(e) => setExperienceComment(e.target.value)}
          />
          <Button
            onClick={submitExperience}
            disabled={experienceRating === 0 || savingExperience}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            {savingExperience ? "Saving..." : "Submit feedback"}
          </Button>
        </div>
      ) : (
        <p className="mt-4 border-t border-border pt-4 text-sm text-success">Thanks for your feedback!</p>
      )}

      {composerItem && (
        <ReviewComposer
          productName={composerItem.name}
          orderItemId={composerItem.id}
          existing={reviewFor(composerItem.id)}
          onClose={() => setComposerItem(null)}
          onSaved={() => {
            setComposerItem(null);
            fetch(`/api/reviews/mine?orderId=${orderId}`)
              .then((r) => r.json())
              .then((d) => setMyReviews(d.reviews ?? []));
          }}
        />
      )}
    </div>
  );
}
