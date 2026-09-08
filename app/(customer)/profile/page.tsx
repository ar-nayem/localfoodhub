"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, ClipboardList, Heart, Bell, LifeBuoy, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Session {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setSession(d.session));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (session === undefined) return null;

  if (!session) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <User size={26} className="mb-3 text-muted-foreground" />
        <h1 className="text-lg font-semibold">You&apos;re browsing as a guest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to save favorites, see order history, and check out faster.
        </p>
        <Link href="/login">
          <Button className="mt-4">Sign in</Button>
        </Link>
      </main>
    );
  }

  const links = [
    { href: "/orders", label: "Order history", icon: ClipboardList },
    { href: "/profile/locations", label: "Saved locations", icon: MapPin },
    { href: "/favorites", label: "Favorites", icon: Heart },
    { href: "/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
          {session.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{session.name}</p>
          <p className="text-sm text-muted-foreground">{session.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5"
          >
            <Icon size={18} className="text-muted-foreground" />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-muted-foreground">
          <LifeBuoy size={18} />
          <span>Support — contact your shop directly for now</span>
        </div>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-error"
        >
          <LogOut size={18} />
          <span className="font-medium">Log out</span>
        </button>
      </div>
    </main>
  );
}
