import { prisma } from "@/lib/prisma";

/** Clears `isDefault` on every other address for this user — SQLite has no partial-unique
 * index for "at most one true", so "at most one default" is enforced here instead. */
export async function clearOtherDefaults(userId: string, keepId?: string) {
  await prisma.address.updateMany({
    where: { userId, isDefault: true, ...(keepId ? { id: { not: keepId } } : {}) },
    data: { isDefault: false },
  });
}
