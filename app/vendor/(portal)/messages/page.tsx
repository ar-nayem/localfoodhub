"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationThread } from "@/components/shared/ConversationThread";

interface ConversationRow {
  orderId: string;
  orderNumber: string;
  shopName: string;
  customerName: string;
  lastMessage: { text: string | null; messageType: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

export default function VendorMessagesPage() {
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/vendor/messages");
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Messages</h1>

      {rows && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No conversations yet — they show up here once a customer messages you about an order.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows?.map((r) => (
          <button
            key={r.orderId}
            onClick={() => {
              setOpenOrderId(r.orderId);
              // Optimistic — the thread's own load(true) call marks it read for real.
              setRows((prev) => prev?.map((row) => (row.orderId === r.orderId ? { ...row, unreadCount: 0 } : row)) ?? null);
            }}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">{r.customerName}</p>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(r.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Order #{r.orderNumber} ·{" "}
                {r.lastMessage ? (r.lastMessage.messageType === "IMAGE" ? "Sent a photo" : r.lastMessage.text) : "No messages yet"}
              </p>
            </div>
            {r.unreadCount > 0 && (
              <span className={cn("flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground")}>
                {r.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {openOrderId && (
        <ConversationThread orderId={openOrderId} viewerRole="VENDOR" onClose={() => setOpenOrderId(null)} />
      )}
    </div>
  );
}
