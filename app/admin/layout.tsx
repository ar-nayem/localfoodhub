import { redirect } from "next/navigation";
import { getSession, isAdminRole } from "@/lib/auth";
import { AdminChrome } from "@/components/admin/AdminChrome";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !isAdminRole(session.role)) redirect("/login?next=/admin");
  return <AdminChrome>{children}</AdminChrome>;
}
