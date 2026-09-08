"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Image as ImageIcon, Phone, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";

interface MessageRow {
  id: string;
  senderRole: "CUSTOMER" | "VENDOR";
  messageType: "TEXT" | "IMAGE";
  text: string | null;
  mediaUrl: string | null;
  createdAt: string;
}

interface ThreadData {
  conversationId: string | null;
  viewerRole: "CUSTOMER" | "VENDOR";
  order: { orderNumber: string };
  shop: { name: string; phone: string | null };
  counterpart: { name: string; phone: string | null } | null;
  messages: MessageRow[];
}

/**
 * The chat surface for one order's thread — identical component on both sides, driven
 * entirely by `viewerRole` for bubble alignment and header identity. No WebSocket/SSE
 * infra exists in this app (plain `next start`, no custom server), so this polls the same
 * way OrderView already does for order-status updates — a real, working update path, not
 * a fake one, just not instant.
 */
export function ConversationThread({
  orderId,
  viewerRole,
  title,
  onClose,
}: {
  orderId: string;
  viewerRole: "CUSTOMER" | "VENDOR";
  title?: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load(markRead: boolean) {
    const res = await fetch(`/api/orders/${orderId}/conversation`);
    if (res.ok) setData(await res.json());
    if (markRead) fetch(`/api/orders/${orderId}/conversation/read`, { method: "POST" }).catch(() => undefined);
  }

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [data?.messages.length]);

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast("Please choose a JPG, PNG, or WEBP image.", "error");
      return;
    }
    setPendingImage(file);
    setPendingPreview(URL.createObjectURL(file));
  }

  async function send() {
    if (sending || (!text.trim() && !pendingImage)) return;
    setSending(true);
    try {
      let mediaUrl: string | undefined;
      let mimeType: string | undefined;
      let fileSize: number | undefined;
      if (pendingImage) {
        const form = new FormData();
        form.set("orderId", orderId);
        form.set("file", pendingImage);
        const upRes = await fetch("/api/messages/upload", { method: "POST", body: form });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Image upload failed");
        mediaUrl = upData.url;
        mimeType = upData.mimeType;
        fileSize = upData.fileSize;
      }
      const res = await fetch(`/api/orders/${orderId}/conversation/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() || undefined, mediaUrl, mimeType, fileSize }),
      });
      const message = await res.json();
      if (!res.ok) throw new Error(message.error || "Could not send message");
      setData((d) => (d ? { ...d, messages: [...d.messages, message] } : d));
      setText("");
      setPendingImage(null);
      setPendingPreview(null);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send message", "error");
    } finally {
      setSending(false);
    }
  }

  const headerName = title ?? (viewerRole === "CUSTOMER" ? data?.shop.name : data?.counterpart?.name) ?? "Chat";
  const headerPhone = viewerRole === "CUSTOMER" ? data?.shop.phone : data?.counterpart?.phone;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-surface sm:h-[80vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{headerName}</p>
            <p className="text-xs text-muted-foreground">Order #{data?.order.orderNumber ?? "..."}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {headerPhone && (
              <a
                href={`tel:${headerPhone}`}
                aria-label="Call"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <Phone size={16} />
              </a>
            )}
            <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X size={18} />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {!data ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : data.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet — say hello.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.messages.map((m) => {
                const mine = m.senderRole === viewerRole;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      )}
                    >
                      {m.messageType === "IMAGE" && m.mediaUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.mediaUrl} alt="Shared photo" className="mb-1 max-h-56 rounded-xl object-cover" />
                      )}
                      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                      <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pendingPreview && (
          <div className="flex items-center gap-2 border-t border-border px-4 pt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingPreview} alt="Selected" className="h-14 w-14 rounded-lg object-cover" />
            <button
              onClick={() => {
                setPendingImage(null);
                setPendingPreview(null);
              }}
              className="text-xs font-medium text-error"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-border p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach photo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ImageIcon size={19} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={send}
            disabled={sending || (!text.trim() && !pendingImage)}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
}
