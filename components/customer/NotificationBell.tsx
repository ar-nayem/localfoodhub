"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  orderId: string | null;
  shopId: string | null;
  productId: string | null;
}

/** Resolves where a notification should take you. Returns null when it has nothing
 * concrete to open, so the card stays inert rather than navigating somewhere wrong. */
function destinationFor(n: NotificationRow): string | null {
  if (n.orderId) return `/orders/${n.orderId}`;
  if (n.productId && n.shopId) return `/orders`;
  if (n.shopId) return `/orders`;
  return null;
}

type BellVariant = "desktop" | "mobile" | "mobile-header";

export function NotificationBell({ variant }: { variant: BellVariant }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState(false);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        // 401 just means signed out — an empty bell, not an error state.
        if (res.status === 401) {
          setItems([]);
          setUnread(0);
          setError(false);
          return;
        }
        throw new Error("failed");
      }
      const data: NotificationRow[] = await res.json();
      setItems(data);
      setUnread(data.filter((n) => !n.read).length);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click and on Escape, returning focus to the trigger so keyboard
  // users are never stranded inside a dismissed panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      load();
      panelRef.current?.focus();
    }
  }, [open, load]);

  async function openNotification(n: NotificationRow) {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      setUnread((u) => Math.max(0, u - 1));
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      }).catch(() => undefined);
    }
    const destination = destinationFor(n);
    setOpen(false);
    if (destination) router.push(destination);
  }

  async function markAllRead() {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
    setUnread(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
  }

  const badge =
    unread > 0 ? (
      <span
        className={cn(
          "absolute flex items-center justify-center rounded-full bg-error text-white",
          variant === "mobile" ? "-right-1.5 -top-1 h-3.5 w-3.5 text-[9px]" : "-right-1 -top-1 h-4 w-4 text-[10px]"
        )}
      >
        {unread > 9 ? "9+" : unread}
      </span>
    ) : null;

  return (
    <div ref={containerRef} className={cn("relative", variant === "mobile" && "flex flex-1")}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          variant === "mobile" &&
            "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] text-muted-foreground",
          variant === "mobile-header" && "relative flex h-10 w-10 items-center justify-center rounded-full",
          variant === "desktop" &&
            "relative flex h-10 w-10 items-center justify-center rounded-full border border-border"
        )}
      >
        <span className="relative">
          <Bell size={variant === "desktop" ? 18 : 20} />
          {badge}
        </span>
        {variant === "mobile" && "Alerts"}
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg outline-none",
            variant === "mobile" && "fixed bottom-16 left-1/2 max-h-[60vh] -translate-x-1/2",
            variant === "mobile-header" && "fixed right-4 top-16 max-h-[70vh]",
            variant === "desktop" && "absolute right-0 top-12 max-h-[70vh]"
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-primary">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            {error ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                <p>Couldn&apos;t load notifications.</p>
                <button onClick={load} className="mt-2 font-medium text-primary">
                  Try again
                </button>
              </div>
            ) : items === null ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading notifications...</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted/60",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-primary"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{n.title}</span>
                    <span className="block text-sm text-muted-foreground">{n.body}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-3 text-center text-sm font-medium text-primary"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
