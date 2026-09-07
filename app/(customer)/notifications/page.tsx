"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[] | null>(null);

  useEffect(() => {
    fetch("/api/notifications").then(async (r) => (r.ok ? setItems(await r.json()) : setItems([])));
  }, []);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? null);
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <h1 className="mb-4 text-xl font-bold">Notifications</h1>
      {items && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          Nothing yet — order updates will show up here.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {items?.map((n) => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className={cn(
              "flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left",
              !n.read && "bg-primary/5"
            )}
          >
            <Bell size={16} className={cn("mt-0.5 shrink-0", !n.read ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
