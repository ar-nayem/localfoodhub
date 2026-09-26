import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession, isStaffRole } from "@/lib/auth";
import { BusinessLogin } from "@/components/vendor/BusinessLogin";

export const dynamic = "force-dynamic";

// Checked here rather than in middleware on purpose: getSession() also confirms the user
// row still exists, so a valid-but-orphaned token can't bounce between this page and the
// dashboard guard forever.
export default async function BusinessLoginPage() {
  const session = await getSession();
  if (session && isStaffRole(session.role)) redirect("/vendor");
  return (
    <Suspense fallback={null}>
      <BusinessLogin />
    </Suspense>
  );
}
