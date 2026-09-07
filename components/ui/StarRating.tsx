"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 20,
  readOnly = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={cn(!readOnly && "cursor-pointer")}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
        >
          <Star
            size={size}
            className={star <= value ? "fill-warning text-warning" : "text-muted-foreground"}
          />
        </button>
      ))}
    </div>
  );
}
