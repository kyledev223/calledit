import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { tokenAmount, type PayoutSettings, type UnpaidRow } from "@/lib/admin-shared";

export { tokenAmount, toCsv, type PayoutSettings, type UnpaidRow } from "@/lib/admin-shared";

export const SETTING_KEYS = {
  rate: "payout.rate", // tokens per point
  token: "payout.token", // e.g. USDC
} as const;

export async function getPayoutSettings(): Promise<PayoutSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [SETTING_KEYS.rate, SETTING_KEYS.token] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    rate: Number(map.get(SETTING_KEYS.rate) ?? "0.01"),
    token: map.get(SETTING_KEYS.token) ?? "USDC",
  };
}

/** Every wallet with ledger history, largest unpaid balance first. */
export async function getUnpaidBalances(): Promise<UnpaidRow[]> {
  const [unpaid, lifetime, paid] = await Promise.all([
    prisma.ledgerEntry.groupBy({ by: ["userId"], where: { payoutId: null }, _sum: { delta: true } }),
    prisma.ledgerEntry.groupBy({ by: ["userId"], _sum: { delta: true } }),
    prisma.payout.groupBy({ by: ["userId"], _sum: { points: true } }),
  ]);
  const ids = new Set([...unpaid, ...lifetime].map((r) => r.userId));
  if (!ids.size) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, wallet: true, displayName: true, isFlagged: true },
  });
  const unpaidMap = new Map(unpaid.map((r) => [r.userId, r._sum.delta ?? 0]));
  const lifeMap = new Map(lifetime.map((r) => [r.userId, r._sum.delta ?? 0]));
  const paidMap = new Map(paid.map((r) => [r.userId, r._sum.points ?? 0]));
  return users
    .map((u) => ({
      userId: u.id,
      wallet: u.wallet,
      displayName: u.displayName,
      isFlagged: u.isFlagged,
      unpaid: unpaidMap.get(u.id) ?? 0,
      lifetime: lifeMap.get(u.id) ?? 0,
      paidPoints: paidMap.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.unpaid - a.unpaid);
}

/**
 * Record a payout for a wallet's current unpaid balance and attach every
 * unpaid ledger row to it. One transaction, so a concurrent award cannot be
 * half-included.
 */
export async function markPaid(input: { wallet: string; txSignature: string; note?: string; paidBy: string }) {
  const user = await prisma.user.findUnique({ where: { wallet: input.wallet } });
  if (!user) throw new ApiError("No such wallet.", 404);
  const settings = await getPayoutSettings();

  return prisma.$transaction(async (tx) => {
    const rows = await tx.ledgerEntry.findMany({ where: { userId: user.id, payoutId: null }, select: { id: true, delta: true } });
    const points = rows.reduce((s, r) => s + r.delta, 0);
    if (points <= 0) throw new ApiError("Nothing unpaid for this wallet.");
    const payout = await tx.payout.create({
      data: {
        userId: user.id,
        points,
        amount: new Prisma.Decimal(tokenAmount(points, settings.rate)),
        token: settings.token,
        rate: new Prisma.Decimal(settings.rate),
        txSignature: input.txSignature,
        paidBy: input.paidBy,
        note: input.note,
      },
    });
    await tx.ledgerEntry.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { payoutId: payout.id } });
    return payout;
  });
}

/** Admin void: a negative ledger row that reduces the unpaid balance. */
export async function voidPoints(input: { wallet: string; points?: number; note?: string; by: string }) {
  const user = await prisma.user.findUnique({ where: { wallet: input.wallet } });
  if (!user) throw new ApiError("No such wallet.", 404);
  const agg = await prisma.ledgerEntry.aggregate({ where: { userId: user.id, payoutId: null }, _sum: { delta: true } });
  const unpaid = agg._sum.delta ?? 0;
  const amount = input.points ?? unpaid;
  if (amount <= 0) throw new ApiError("Nothing to void.");
  if (amount > unpaid) throw new ApiError(`Only ${unpaid} unpaid points available to void.`);
  const row = await prisma.ledgerEntry.create({
    data: { userId: user.id, delta: -amount, reason: "VOID", note: input.note ?? `Voided by ${input.by}` },
  });
  return { voided: amount, remaining: unpaid - amount, entryId: row.id };
}

export async function getAdminOverview() {
  const [balances, settings, payouts, links, flagged] = await Promise.all([
    getUnpaidBalances(),
    getPayoutSettings(),
    prisma.payout.findMany({ orderBy: { paidAt: "desc" }, take: 50, include: { user: { select: { wallet: true, displayName: true } } } }),
    prisma.walletLink.findMany({
      include: { userA: { select: { wallet: true, displayName: true } }, userB: { select: { wallet: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isFlagged: true }, select: { wallet: true, displayName: true, flagNote: true } }),
  ]);
  return {
    balances,
    settings,
    payouts: payouts.map((p) => ({
      id: p.id,
      wallet: p.user.wallet,
      displayName: p.user.displayName,
      points: p.points,
      amount: p.amount.toString(),
      token: p.token,
      txSignature: p.txSignature,
      paidAt: p.paidAt.toISOString(),
      paidBy: p.paidBy,
    })),
    links: links.map((l) => ({ id: l.id, a: l.userA, b: l.userB, note: l.note, createdAt: l.createdAt.toISOString() })),
    flagged,
  };
}

export type AdminOverview = Awaited<ReturnType<typeof getAdminOverview>>;
