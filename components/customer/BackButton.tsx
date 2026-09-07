"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Back control for the full-bleed mobile headers (shop, product, order). Falls back to
 * the home page when there's no history to go back to — e.g. the page was opened
 * straight from a scanned QR code, which is a common entry point here. */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur"
    >
      <ChevronLeft size={20} />
    </button>
  );
}
