"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, QrCode, MapPin, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/shops", label: "Shops", icon: Store },
  { href: "/admin/qr", label: "QR Codes", icon: QrCode },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
];

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-secondary text-secondary-foreground sm:flex">
        <div className="border-b border-white/10 p-4">
          <Logo />
          <span className="mt-1 block text-xs text-white/60">Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="m-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70">
          <LogOut size={17} />
          Log out
        </button>
      </aside>

      <div className="flex-1 bg-background">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
          <Logo iconOnly />
          <button onClick={logout} className="text-sm text-error">
            Log out
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 sm:hidden">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium",
                pathname === href ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
