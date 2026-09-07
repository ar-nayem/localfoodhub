"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Grid3x3,
  QrCode,
  ScanLine,
  Users,
  Settings,
  LogOut,
  Palette,
  Percent,
  Star,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/vendor", label: "Overview", icon: LayoutDashboard },
  { href: "/vendor/orders", label: "Orders", icon: ClipboardList },
  { href: "/vendor/kitchen", label: "Kitchen Display", icon: UtensilsCrossed },
  { href: "/vendor/scan", label: "Scan to Verify", icon: ScanLine },
  { href: "/vendor/menu", label: "Menu", icon: Grid3x3 },
  { href: "/vendor/storefront", label: "Customize Shop", icon: Palette, ownerOnly: true },
  { href: "/vendor/discounts", label: "Discounts", icon: Percent, ownerOnly: true },
  { href: "/vendor/tables", label: "Tables", icon: Grid3x3 },
  { href: "/vendor/qr", label: "QR Center", icon: QrCode },
  { href: "/vendor/reviews", label: "Reviews", icon: Star },
  { href: "/vendor/staff", label: "Staff", icon: Users, ownerOnly: true },
  { href: "/vendor/settings", label: "Settings", icon: Settings },
];

export function VendorChrome({ children, role }: { children: React.ReactNode; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV.filter((item) => !item.ownerOnly || role === "SHOP_OWNER");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface sm:flex">
        <div className="border-b border-border p-4">
          <Logo />
          <span className="mt-1 block text-xs text-muted-foreground">Vendor dashboard</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/vendor" ? pathname === "/vendor" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="m-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-error"
        >
          <LogOut size={17} />
          Log out
        </button>
      </aside>

      {/* min-w-0 is load-bearing: a flex child defaults to min-width:auto, so the
          horizontally scrolling nav below would otherwise widen this whole column to its
          content width and push every page's content off the side of a phone screen. */}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
          <Logo iconOnly />
          <button onClick={logout} className="text-sm text-error">
            Log out
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 sm:hidden">
          {nav.map(({ href, label }) => (
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
