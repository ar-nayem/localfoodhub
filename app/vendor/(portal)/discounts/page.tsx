import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DiscountManager } from "@/components/vendor/DiscountManager";

export default async function VendorDiscountsPage() {
  const session = await getSession();
  if (session?.role !== "SHOP_OWNER") redirect("/vendor");
  return <DiscountManager />;
}
