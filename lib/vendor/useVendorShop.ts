"use client";

import { useEffect, useState } from "react";

export interface VendorShop {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  address: string;
  phone?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  status: string;
  supportsDelivery: boolean;
  supportsPickup: boolean;
  supportsDineIn: boolean;
  deliveryFee: number;
  minOrder: number;
  prepTimeMinutes: number;
}

/** Every vendor page needs "my shop's id" to scope its API calls — this hook fetches it
 * once from /api/vendor/shop (session-derived, no id passed by the client). */
export function useVendorShop() {
  const [shop, setShop] = useState<VendorShop | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/vendor/shop")
      .then((r) => (r.ok ? r.json() : null))
      .then(setShop);
  }, []);

  return { shop, loading: shop === undefined };
}
