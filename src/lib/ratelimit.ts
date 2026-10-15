import type { Prisma, PrismaClient } from "@prisma/client";
import { AuthError } from "@/lib/auth/session";

type Db = PrismaClient | Prisma.TransactionClient;

export const LIMITS = {
  post: { max: 10, windowMs: 60 * 60 * 1000, label: "10 calls per hour" },
  back: { max: 30, windowMs: 60 * 60 * 1000, label: "30 buy-throughs per hour" },
  upvote: { max: 120, windowMs: 60 * 60 * 1000, label: "120 upvotes per hour" },
} as const;

export type RateAction = keyof typeof LIMITS;

/** Pure decision used by the DB helper and the tests. */
export function isRateLimited(countInWindow: number, action: RateAction): boolean {
  return countInWindow >= LIMITS[action].max;
}

/** Throws a 429 AuthError if the wallet has exceeded the per-action budget. Records the action otherwise. */
export async function enforceRateLimit(db: Db, userId: string, action: RateAction): Promise<void> {
  const { windowMs, label } = LIMITS[action];
  const since = new Date(Date.now() - windowMs);
  const count = await db.actionLog.count({ where: { userId, action, createdAt: { gte: since } } });
  if (isRateLimited(count, action)) {
    throw new AuthError(`Slow down. The limit is ${label}.`, 429);
  }
  await db.actionLog.create({ data: { userId, action } });
}
