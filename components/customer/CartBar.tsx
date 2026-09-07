"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import { formatMoney } from "@/lib/utils";
import { ACTIVE_ORDER_TYPES } from "@/lib/constants";

// The cart page and checkout have their own totals bar; product detail has its own
// add-to-cart bar. Everywhere else, this is the shortcut straight to payment.
const HIDDEN_ON = ["/cart", "/checkout", "/orders/"];

/**
 * Sticky "N items · total → Checkout" bar shown as soon as there's something in the cart.
 * Lets a customer pay from wherever they added the item instead of detouring through the
 * cart page; the cart is still one tap away for anyone who wants to review it first.
 */
export function CartBar() {
  const pathname = usePathname();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore((s) => s.itemCount());
  const subtotal = useCartStore((s) => s.subtotal());
  const orderMode = useCartStore((s) => s.orderMode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const setOrderContext = useCartStore((s) => s.setOrderContext);

  if (items.length === 0) return null;
  if (pathname.includes("/product/")) return null;
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  function checkout() {
    // Checkout needs a mode; default to the first order type still offered so a customer
    // who never touched the switch still gets there, and can change it at checkout.
    if (!orderMode) setOrderContext({ orderMode: ACTIVE_ORDER_TYPES[0] as "PICKUP" | "DINE_IN" });
    router.push("/checkout");
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-3 pb-2 sm:bottom-4">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground shadow-lg">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <ShoppingBag size={17} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {itemCount}
          </span>
        </span>
        <Link href="/cart" className="min-w-0 flex-1 leading-tight">
          <span className="block text-xs text-secondary-foreground/70">
            {itemCount} item{itemCount === 1 ? "" : "s"} · view cart
          </span>
          <span className="block text-sm font-bold">{formatMoney(subtotal - promoDiscount)}</span>
        </Link>
        <button
          onClick={checkout}
          className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-secondary"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
