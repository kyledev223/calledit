import type { LedgerReason, Prisma, PrismaClient } from "@prisma/client";

/**
 * Point rules. Everything here produces ledger rows; balances are sums.
 *
 *  When a call plays out:
 *    author  +2 per upvote            (AUTHOR_UPVOTE, one row per upvote)
 *    author  +5 per buy-through       (AUTHOR_BUYTHROUGH, one row per buy-through)
 *    backer  +3 per buy-through       (BACKER_BUYTHROUGH)
 *  When a played-out call is deleted:
 *    every award row for that call gets a mirrored negative REVERSAL row.
 */
export const POINTS = {
  AUTHOR_PER_UPVOTE: 2,
  AUTHOR_PER_BUYTHROUGH: 5,
  BACKER_PER_BUYTHROUGH: 3,
} as const;

export interface AwardInput {
  callId: string;
  authorId: string;
  upvoterIds: string[];
  backerIds: string[];
}

export interface LedgerRow {
  userId: string;
  callId: string | null;
  delta: number;
  reason: LedgerReason;
  note?: string;
}

/** Pure: which ledger rows a played-out call produces. */
export function computeAwards(input: AwardInput): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const upvoter of input.upvoterIds) {
    // Authors cannot upvote themselves, but guard anyway.
    if (upvoter === input.authorId) continue;
    rows.push({ userId: input.authorId, callId: input.callId, delta: POINTS.AUTHOR_PER_UPVOTE, reason: "AUTHOR_UPVOTE" });
  }
  for (const backer of input.backerIds) {
    if (backer === input.authorId) continue;
    rows.push({ userId: input.authorId, callId: input.callId, delta: POINTS.AUTHOR_PER_BUYTHROUGH, reason: "AUTHOR_BUYTHROUGH" });
    rows.push({ userId: backer, callId: input.callId, delta: POINTS.BACKER_PER_BUYTHROUGH, reason: "BACKER_BUYTHROUGH" });
  }
  return rows;
}

const AWARD_REASONS: LedgerReason[] = ["AUTHOR_UPVOTE", "AUTHOR_BUYTHROUGH", "BACKER_BUYTHROUGH"];

/** Pure: mirror every award row for a call with a negative reversal. */
export function computeReversals(
  existing: Array<Pick<LedgerRow, "userId" | "callId" | "delta" | "reason">>,
  note = "Call deleted by author",
): LedgerRow[] {
  return existing
    .filter((r) => AWARD_REASONS.includes(r.reason) && r.delta > 0)
    .map((r) => ({ userId: r.userId, callId: r.callId, delta: -r.delta, reason: "REVERSAL" as const, note }));
}

/** Pure: sum of deltas. */
export function balanceOf(rows: Array<{ delta: number }>): number {
  return rows.reduce((s, r) => s + r.delta, 0);
}

type Db = PrismaClient | Prisma.TransactionClient;

/** Persist awards for a played-out call. Idempotent: skips if any award row already exists. */
export async function awardForCall(db: Db, callId: string): Promise<LedgerRow[]> {
  const already = await db.ledgerEntry.count({ where: { callId, reason: { in: AWARD_REASONS } } });
  if (already > 0) return [];
  const call = await db.call.findUniqueOrThrow({
    where: { id: callId },
    include: { upvotes: { select: { userId: true } }, buyThroughs: { select: { userId: true } } },
  });
  const rows = computeAwards({
    callId,
    authorId: call.authorId,
    upvoterIds: call.upvotes.map((u) => u.userId),
    backerIds: call.buyThroughs.map((b) => b.userId),
  });
  if (rows.length) await db.ledgerEntry.createMany({ data: rows });
  return rows;
}

/** Persist reversals for a deleted call. Idempotent: skips if reversals already exist. */
export async function reverseForCall(db: Db, callId: string): Promise<LedgerRow[]> {
  const alreadyReversed = await db.ledgerEntry.count({ where: { callId, reason: "REVERSAL" } });
  if (alreadyReversed > 0) return [];
  const existing = await db.ledgerEntry.findMany({
    where: { callId },
    select: { userId: true, callId: true, delta: true, reason: true },
  });
  const rows = computeReversals(existing);
  if (rows.length) await db.ledgerEntry.createMany({ data: rows });
  return rows;
}

/** Points earned (sum of all rows) for a user, optionally since a date. */
export async function pointsForUser(db: Db, userId: string, since?: Date): Promise<number> {
  const agg = await db.ledgerEntry.aggregate({
    where: { userId, ...(since ? { createdAt: { gte: since } } : {}) },
    _sum: { delta: true },
  });
  return agg._sum.delta ?? 0;
}

/** Unpaid balance = rows not yet attached to a payout. */
export async function unpaidBalance(db: Db, userId: string): Promise<number> {
  const agg = await db.ledgerEntry.aggregate({ where: { userId, payoutId: null }, _sum: { delta: true } });
  return agg._sum.delta ?? 0;
}
