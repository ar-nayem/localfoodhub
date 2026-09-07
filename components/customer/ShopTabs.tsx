"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Clock } from "lucide-react";
import { ReviewList } from "./ReviewList";
import { cn } from "@/lib/utils";

type Tab = "menu" | "reviews" | "photos" | "about";
const TABS: { key: Tab; label: string }[] = [
  { key: "menu", label: "Menu" },
  { key: "reviews", label: "Reviews" },
  { key: "photos", label: "Photos" },
  { key: "about", label: "About" },
];

interface PhotoRow {
  id: string;
  url: string;
  type: string;
}

/** Shop page tab bar. Photos are real customer review media, not a separate gallery —
 * there is no shop photo-album feature, so this surfaces what customers actually posted
 * rather than inventing an empty one. */
export function ShopTabs({
  shopId,
  shopName,
  description,
  address,
  openingHours,
  children,
}: {
  shopId: string;
  shopName: string;
  description: string;
  address: string;
  openingHours: { day: string; open: string; close: string }[];
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("menu");
  const [photos, setPhotos] = useState<PhotoRow[] | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (tab !== "photos" || photos !== null) return;
    fetch(`/api/reviews?shopId=${shopId}`)
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((d: { reviews: { media: PhotoRow[] }[] }) =>
        setPhotos(d.reviews.flatMap((r) => r.media).filter((m) => m.type === "IMAGE"))
      )
      .catch(() => setPhotos([]));
  }, [tab, photos, shopId]);

  // Arrow-key navigation across the tab list, per the standard tabs interaction pattern.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    setTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={`${shopName} sections`}
        className="sticky top-0 z-20 mt-4 flex gap-5 border-b border-border bg-background px-4 sm:px-6"
      >
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            aria-selected={tab === t.key}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "border-b-2 py-2.5 text-sm font-semibold",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "menu" && children}

        {tab === "reviews" && (
          <div className="px-4 pt-2 sm:px-6">
            <ReviewList shopId={shopId} shopName={shopName} />
          </div>
        )}

        {tab === "photos" && (
          <div className="px-4 pt-4 sm:px-6">
            {photos === null ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading photos...</p>
            ) : photos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No customer photos yet — be the first to share one with your review.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.id}
                    src={p.url}
                    alt="Customer photo"
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "about" && (
          <div className="px-4 pt-4 sm:px-6">
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <span className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                {address}
              </span>
              {openingHours.length > 0 && (
                <div className="flex items-start gap-2">
                  <Clock size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    {openingHours.map((h) => (
                      <span key={h.day}>
                        <span className="font-medium">{h.day}</span> · {h.open}–{h.close}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
