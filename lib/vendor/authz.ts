import { NextResponse } from "next/server";
import { getSession, isStaffRole, type SessionPayload } from "../auth";

/** Shared guard for /api/vendor/* routes: session must be staff and own the shopId. */
export async function requireShopAccess(
  shopId: string | null | undefined
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (shopId && !session.shopIds.includes(shopId)) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 403 }) };
  }
  return { session };
}
