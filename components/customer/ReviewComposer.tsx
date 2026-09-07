"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";
import { ReviewMediaPicker, type ReviewMediaItem } from "./ReviewMediaPicker";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { REVIEW_TAGS } from "@/lib/constants";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const RATING_WORDS: Record<number, string> = {
  1: "Not great",
  2: "Could be better",
  3: "Okay",
  4: "Good!",
  5: "Excellent!",
};

/** The review composer (spec Section 203): rating → text → photos/video → tags → post.
 * Works for both a first-time review and editing an existing one. */
export function ReviewComposer({
  productName,
  orderItemId,
  existing,
  onClose,
  onSaved,
}: {
  productName: string;
  orderItemId: string;
  existing?: {
    id: string;
    rating: number;
    comment: string | null;
    tags: string;
    media: ReviewMediaItem[];
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [tags, setTags] = useState<string[]>(existing ? safeParseTags(existing.tags) : []);
  const [photos, setPhotos] = useState<ReviewMediaItem[]>(
    existing?.media.filter((m) => m.type === "IMAGE") ?? []
  );
  const [video, setVideo] = useState<ReviewMediaItem | null>(
    existing?.media.find((m) => m.type === "VIDEO") ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (rating === 0) {
      toast("Pick a star rating first", "error");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderItemId,
        rating,
        comment: comment || undefined,
        tags,
        media: [...photos, ...(video ? [video] : [])],
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast(data.error || "Could not post review", "error");
      return;
    }
    toast("Thanks for sharing! ❤️", "success");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">How was your {productName}?</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center py-3">
          <StarRating value={rating} onChange={setRating} size={32} />
          {rating > 0 && <p className="mt-2 text-sm font-medium text-primary">{RATING_WORDS[rating]}</p>}
        </div>

        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us what you thought... (optional)"
          rows={3}
          maxLength={2000}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{comment.length} / 2000</p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {REVIEW_TAGS.map((t) => {
            const active = tags.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() =>
                  setTags((prev) => (active ? prev.filter((x) => x !== t.key) : [...prev, t.key]))
                }
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  active
                    ? t.sentiment === "positive"
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-error/40 bg-error/10 text-error"
                    : "border-border text-muted-foreground"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <ReviewMediaPicker
            orderItemId={orderItemId}
            photos={photos}
            onPhotosChange={setPhotos}
            video={video}
            onVideoChange={setVideo}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Only upload photos and videos you have permission to share.
        </p>

        <Button onClick={submit} disabled={submitting} className="mt-4 w-full" size="lg">
          {submitting ? "Posting..." : existing ? "Update Review" : "Post Review"}
        </Button>
      </div>
    </div>
  );
}

function safeParseTags(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}
