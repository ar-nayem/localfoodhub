"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Store, QrCode, MapPin, LogOut, LayoutTemplate, TrendingUp, Wallet, Users } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/shops", label: "Shops", icon: Store },
  { href: "/admin/analytics", label: "Sales & Insights", icon: TrendingUp },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/qr", label: "QR Codes", icon: QrCode },
  { href: "/admin/qr-templates", label: "QR Templates", icon: LayoutTemplate },
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
    <div className="operations-experience admin-experience flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-secondary text-secondary-foreground sm:flex">
        <div className="border-b border-white/10 p-4">
          <Logo />
          <span className="mt-2 block text-xs font-semibold uppercase tracking-widest text-white/60">Company workspace</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition duration-200",
                  active ? "bg-white text-secondary shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
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

      {/* min-w-0 so the scrolling mobile nav can't widen this column past the screen. */}
      <div className="min-w-0 flex-1 bg-background">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
          <Logo iconOnly />
          <button onClick={logout} className="text-sm text-error">
            Log out
          </button>
        </header>
        <nav className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-border bg-surface/95 px-3 py-2 backdrop-blur sm:hidden">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors",
                pathname === href ? "bg-secondary text-white" : "bg-muted/60 text-muted-foreground"
              )}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
