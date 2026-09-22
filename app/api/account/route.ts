import path from "path";
import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, SESSION_COOKIE_NAME, LEGACY_SESSION_COOKIE_NAMES } from "@/lib/auth";

// Account deletion — required by the Play Store for any app that lets people sign up.
//
// This is anonymise-and-detach, not a cascade. Orders are the shops' settlement records:
// deleting them would rewrite a vendor's revenue history and every payout already made
// against it. So orders stay, stripped of everything that identifies the person, and
// everything that exists only for the person — addresses, favourites, notifications,
// sign-in codes, the account itself — is removed outright.

/** A shop is actively working these. Deleting mid-order would leave staff preparing food
 * with no way to reach whoever it's for, so the customer finishes or cancels first. */
const IN_PROGRESS = ["CONFIRMED", "ACCEPTED", "PREPARING", "READY", "ASSIGNED", "PICKED_UP", "ON_THE_WAY"];

/** Placed but never paid — abandoned checkouts. These must not block deletion forever, so
 * they're cancelled as part of it. */
const UNPAID_OPEN = ["PENDING", "PAYMENT_PENDING"];

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (body?.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, email: true, phone: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  // Business and admin accounts carry obligations a self-serve button can't settle —
  // payouts owed to a shop, other staff depending on the owner, the platform itself.
  if (user.role !== "CUSTOMER") {
    return NextResponse.json(
      { error: "Business and staff accounts are closed through support, so any payouts can be settled first." },
      { status: 403 }
    );
  }

  const openOrders = await prisma.order.findMany({
    where: { customerId: user.id, orderStatus: { in: [...IN_PROGRESS, ...UNPAID_OPEN] } },
    select: { id: true, orderNumber: true, orderStatus: true, paymentStatus: true, tableId: true },
  });

  const blocking = openOrders.filter(
    (o) => IN_PROGRESS.includes(o.orderStatus) || o.paymentStatus === "PAID"
  );
  if (blocking.length > 0) {
    return NextResponse.json(
      {
        error:
          blocking.length === 1
            ? `Order #${blocking[0].orderNumber} is still in progress. Wait until it's collected, or cancel it, then try again.`
            : `${blocking.length} of your orders are still in progress. Wait until they're collected, or cancel them, then try again.`,
      },
      { status: 409 }
    );
  }
  const abandoned = openOrders.filter((o) => !blocking.includes(o));

  // Chat photos this person sent — collected before the rows are scrubbed, removed from
  // disk after the transaction commits (a file delete can't be rolled back, so it goes last).
  const sentImages = await prisma.message.findMany({
    where: { senderId: user.id, mediaUrl: { not: null } },
    select: { mediaUrl: true },
  });

  const votedReviewIds = (
    await prisma.reviewHelpfulVote.findMany({ where: { userId: user.id }, select: { reviewId: true } })
  ).map((v) => v.reviewId);

  const addressIds = (
    await prisma.address.findMany({ where: { userId: user.id }, select: { id: true } })
  ).map((a) => a.id);

  const now = new Date();
  const destinations = [user.email, user.phone].filter((d): d is string => !!d);

  await prisma.$transaction(async (tx) => {
    for (const order of abandoned) {
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: "CANCELLED", cancelledAt: now, cancelledBy: "CUSTOMER", cancellationReason: "Account deleted" },
      });
      await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "CANCELLED", note: "Account deleted" } });
      if (order.tableId) await tx.table.update({ where: { id: order.tableId }, data: { status: "AVAILABLE" } });
    }

    // Orders stay for the shop's books; everything that names or reaches the person goes.
    await tx.order.updateMany({
      where: { OR: [{ customerId: user.id }, ...(addressIds.length ? [{ deliveryAddressId: { in: addressIds } }] : [])] },
      data: {
        customerId: null,
        guestName: null,
        guestPhone: null,
        recipientName: null,
        recipientPhone: null,
        recipientNote: null,
        notes: null,
        deliveryAddressId: null,
      },
    });

    await tx.message.updateMany({
      where: { senderId: user.id },
      data: { senderId: null, text: "This message was deleted.", mediaUrl: null, messageType: "TEXT" },
    });
    await tx.conversation.updateMany({ where: { customerId: user.id }, data: { customerId: null } });

    // Reviews describe the food, not the person — they stay up so shop ratings don't jump,
    // but they no longer carry a name or link back.
    await tx.review.updateMany({ where: { userId: user.id }, data: { userId: null, reviewerName: "Former customer" } });

    // helpfulCount is a stored counter, so removing this person's votes has to correct it —
    // a cascade would delete the votes and leave every count one too high.
    await tx.reviewHelpfulVote.deleteMany({ where: { userId: user.id } });
    for (const reviewId of Array.from(new Set(votedReviewIds))) {
      const remaining = await tx.reviewHelpfulVote.count({ where: { reviewId } });
      await tx.review.update({ where: { id: reviewId }, data: { helpfulCount: remaining } });
    }

    await tx.auditLog.updateMany({ where: { userId: user.id }, data: { userId: null } });
    await tx.address.deleteMany({ where: { userId: user.id } });
    if (destinations.length) await tx.otpCode.deleteMany({ where: { destination: { in: destinations } } });

    // Staff links, favourites and notifications cascade from here.
    await tx.user.delete({ where: { id: user.id } });
  });

  for (const { mediaUrl } of sentImages) {
    if (!mediaUrl?.startsWith("/uploads/")) continue;
    const target = path.resolve(path.join(process.cwd(), "public", mediaUrl));
    // Never follow a stored URL outside the uploads directory.
    if (!target.startsWith(UPLOADS_ROOT + path.sep)) continue;
    await unlink(target).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  for (const legacyName of LEGACY_SESSION_COOKIE_NAMES) {
    response.cookies.set(legacyName, "", { path: "/", maxAge: 0 });
  }
  return response;
}
