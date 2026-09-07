import { redirect } from "next/navigation";
import { getSession, isStaffRole } from "@/lib/auth";
import { VendorChrome } from "@/components/vendor/VendorChrome";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) redirect("/login?next=/vendor");
  return <VendorChrome role={session.role}>{children}</VendorChrome>;
}
