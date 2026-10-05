"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, ClipboardList, Heart, Bell, LifeBuoy, LogOut, MapPin, ChevronRight } from "lucide-react";
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
        <span className="mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary"><User size={36} /></span>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Your food, your favorites</p>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to your corner</h1>
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
      <div className="mb-6 flex items-center gap-4 rounded-3xl bg-primary p-6 text-white shadow-sm">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold text-white">
          {session.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Your account</p>
          <p className="text-xl font-bold">{session.name}</p>
          <p className="break-all text-sm text-white/75">{session.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-2xl border border-primary/10 bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={19} /></span>
            <span className="flex-1 font-semibold">{label}</span>
            <ChevronRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
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

      <nav className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
        <Link href="/delete-account" className="hover:text-error">Delete account</Link>
      </nav>
    </main>
  );
}
