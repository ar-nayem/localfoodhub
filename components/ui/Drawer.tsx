"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bottom sheet on mobile / right-side panel on wider screens. Used for the cart and
 * similar transient panels — not a Radix wrapper because a plain fixed-position sheet
 * with a click-catching overlay covers every use case here without extra dependency
 * weight. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 animate-fade-in sm:items-center">
      <div
        className={cn(
          "flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl bg-surface animate-slide-up sm:rounded-2xl",
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
