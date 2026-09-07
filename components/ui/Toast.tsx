"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastItem["tone"]) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone = "info") =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), message, tone }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone: ToastItem["tone"] = "info") {
  useToastStore.getState().push(message, tone);
}

const icon = { success: CheckCircle2, error: XCircle, info: Info };
const toneClass = {
  success: "text-success",
  error: "text-error",
  info: "text-info",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const Icon = icon[toast.tone];
  return (
    <div className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-lg animate-slide-up">
      <Icon size={16} className={cn("shrink-0", toneClass[toast.tone])} />
      <span>{toast.message}</span>
    </div>
  );
}
