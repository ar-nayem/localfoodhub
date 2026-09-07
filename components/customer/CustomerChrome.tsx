"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, QrCode, ClipboardList, User, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useCartStore } from "@/lib/cart/store";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";

const MOBILE_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Search", icon: Search },
  { href: "/scan", label: "Scan", icon: QrCode },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/profile", label: "Profile", icon: User },
];

export function CustomerChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
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

      {children}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface sm:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
        <NotificationBell variant="mobile" />
      </nav>
    </div>
  );
}
