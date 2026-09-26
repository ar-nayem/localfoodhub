import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { StorefrontEditor } from "@/components/vendor/StorefrontEditor";

// Storefront theme/banner editing is owner-only (spec Section 140) — staff who land here
// directly get bounced back to the overview rather than seeing a broken/read-only page.
export default async function VendorStorefrontPage() {
  const session = await getSession();
  if (session?.role !== "SHOP_OWNER") redirect("/vendor");
  return <StorefrontEditor />;
}
