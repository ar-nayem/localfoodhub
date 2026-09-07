"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, ClipboardList, User, ShoppingBag, Heart, MapPin, ChevronDown, Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useCartStore } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";

// Bottom navigation. The scanner is not here — it lives at the top left of the mobile
// header, where it must stay.
const MOBILE_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

/** Routes that render their own full-bleed mobile header (shop page, product detail,
 * order tracking) and should not get the standard location bar stacked above them. */
const MOBILE_BARE_HEADER = ["/s/", "/orders/", "/cart", "/checkout", "/scan", "/discover"];

export function CustomerChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());
  const showMobileHeader = !MOBILE_BARE_HEADER.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      {/* Desktop header */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-surface/95 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex flex-1 items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/explore" className={cn(pathname === "/explore" && "text-foreground")}>
              Explore
            </Link>
            <Link href="/orders" className={cn(pathname.startsWith("/orders") && "text-foreground")}>
              Orders
            </Link>
            <Link href="/scan" className={cn(pathname === "/scan" && "text-foreground")}>
              Scan QR
            </Link>
          </nav>
          <NotificationBell variant="desktop" />
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border"
          >
            <ShoppingBag size={18} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Link>
          <Link href="/profile" className="text-sm font-medium">
            Profile
          </Link>
        </div>
      </header>

      {/* Mobile header — location on the left, alerts on the right. */}
      {showMobileHeader && (
        <header className="sticky top-0 z-30 bg-background/95 px-4 pb-2 pt-3 backdrop-blur sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {/* Scanner — top left. */}
              <Link
                href="/scan"
                aria-label="Scan QR code"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <QrCode size={18} />
              </Link>
              <Link href="/explore" className="flex min-w-0 items-center gap-2 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MapPin size={17} />
              </span>
              <span className="leading-tight">
                <span className="block text-[11px] text-muted-foreground">Your Location</span>
                <span className="flex items-center gap-1 truncate text-sm font-semibold">
                  Riverside Food Court
                  <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                </span>
              </span>
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href="/cart"
                aria-label="Cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-full"
              >
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </Link>
              <NotificationBell variant="mobile-header" />
            </div>
          </div>
        </header>
      )}

      {children}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={21} className={cn(active && "fill-primary/15")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
