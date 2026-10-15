import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { getQuote } from "@/lib/prices";
import { expiryIsValid, levelIsOnCorrectSide, type Direction } from "@/lib/resolution";
import { enforceRateLimit } from "@/lib/ratelimit";
import { reverseForCall } from "@/lib/points";

export async function createCall(input: {
  userId: string;
  assetSymbol: string;
  direction: Direction;
  level: number;
  expiresAt: Date;
}) {
  const asset = await prisma.asset.findUnique({ where: { symbol: input.assetSymbol } });
  if (!asset || !asset.isActive) throw new ApiError("Unknown asset.");

  const now = new Date();
  const exp = expiryIsValid(input.expiresAt, now);
  if (!exp.ok) throw new ApiError(exp.reason);

  const quote = await getQuote(asset);
  if (!levelIsOnCorrectSide(input.direction, input.level, quote.price)) {
    throw new ApiError(
      input.direction === "ABOVE"
        ? `Level must be above the current price (${quote.price}).`
        : `Level must be below the current price (${quote.price}).`,
    );
  }

  return prisma.$transaction(async (tx) => {
    await enforceRateLimit(tx, input.userId, "post");
    return tx.call.create({
      data: {
        authorId: input.userId,
        assetId: asset.id,
        direction: input.direction,
        level: new Prisma.Decimal(input.level),
        expiresAt: input.expiresAt,
        priceAtPost: new Prisma.Decimal(quote.price),
        priceAtPostSource: quote.source,
      },
      include: { asset: true, author: true },
    });
  });
}

async function loadBackableCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { id: true, authorId: true, status: true } });
  if (!call || call.status === "DELETED") throw new ApiError("That call is gone.", 404);
  if (call.status !== "LIVE") throw new ApiError("This call has already resolved.");
  if (call.authorId === userId) throw new ApiError("You can't back your own call.");
  return call;
}

/** Linked-wallet rule: a wallet may not back calls from wallets it has been linked to by an admin. */
export async function assertNotLinked(userId: string, authorId: string) {
  const link = await prisma.walletLink.findFirst({
    where: {
      OR: [
        { userAId: userId, userBId: authorId },
        { userAId: authorId, userBId: userId },
      ],
    },
  });
  if (link) throw new ApiError("This wallet can't back calls from a linked wallet.", 403);
}

export async function toggleUpvote(callId: string, userId: string): Promise<{ upvoted: boolean; count: number }> {
  const call = await loadBackableCall(callId, userId);
  const existing = await prisma.upvote.findUnique({ where: { callId_userId: { callId, userId } } });
  if (existing) {
    // Withdrawing is always allowed, even for linked wallets.
    await prisma.upvote.delete({ where: { id: existing.id } });
  } else {
    await assertNotLinked(userId, call.authorId);
    await prisma.$transaction(async (tx) => {
      await enforceRateLimit(tx, userId, "upvote");
      await tx.upvote.create({ data: { callId, userId } });
    });
  }
  const count = await prisma.upvote.count({ where: { callId } });
  return { upvoted: !existing, count };
}

export async function toggleBuyThrough(callId: string, userId: string): Promise<{ backed: boolean; count: number }> {
  const call = await loadBackableCall(callId, userId);
  const existing = await prisma.buyThrough.findUnique({ where: { callId_userId: { callId, userId } } });
  if (existing) {
    // Withdrawing is always allowed, even for linked wallets.
    await prisma.buyThrough.delete({ where: { id: existing.id } });
  } else {
    await assertNotLinked(userId, call.authorId);
    await prisma.$transaction(async (tx) => {
      await enforceRateLimit(tx, userId, "back");
      await tx.buyThrough.create({ data: { callId, userId } });
    });
  }
  const count = await prisma.buyThrough.count({ where: { callId } });
  return { backed: !existing, count };
}

/** Soft-delete. If the call had played out, its awards are reversed for everyone. */
export async function deleteOwnCall(callId: string, userId: string) {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { id: true, authorId: true, status: true } });
  if (!call || call.status === "DELETED") throw new ApiError("That call is gone.", 404);
  if (call.authorId !== userId) throw new ApiError("You can only delete your own calls.", 403);

  return prisma.$transaction(async (tx) => {
    let reversed = 0;
    if (call.status === "PLAYED_OUT") {
      const rows = await reverseForCall(tx, callId);
      reversed = rows.length;
    }
    await tx.call.update({ where: { id: callId }, data: { status: "DELETED", deletedAt: new Date() } });
    return { reversed };
  });
}
