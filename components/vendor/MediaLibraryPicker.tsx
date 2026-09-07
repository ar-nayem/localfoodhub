"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface MediaRow {
  id: string;
  url: string;
  type: string;
  createdAt: string;
}

const CATEGORY_FILTERS = ["All", "FOOD", "SHOP_LOGO", "BANNER", "GALLERY", "PROMOTION", "CATEGORY"];

/** Spec Section 161/162: a shop's full media library, reusable from any upload slot so a
 * vendor never has to upload the same picture twice. */
export function MediaLibraryPicker({
  shopId,
  onSelect,
  onClose,
}: {
  shopId: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/vendor/media?shopId=${shopId}${filter !== "All" ? `&type=${filter}` : ""}`);
    if (res.ok) setMedia(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function remove(id: string) {
    const res = await fetch(`/api/vendor/media?id=${id}`, { method: "DELETE" });
    if (res.status === 409) {
      const data = await res.json();
      if (!confirm(`This image is used in ${data.usageCount} place(s). Delete anyway?`)) return;
      await fetch(`/api/vendor/media?id=${id}&force=true`, { method: "DELETE" });
    } else if (!res.ok) {
      toast("Could not delete image", "error");
      return;
    }
    load();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-surface sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Media Library</h2>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
                filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {f === "SHOP_LOGO" ? "Logo" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : media.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No images here yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {media.map((m) => (
                <div key={m.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                  <button onClick={() => onSelect(m.url)} className="h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  </button>
                  <button
                    onClick={() => remove(m.id)}
                    className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
