import type { AssetCategory, CallStatus, Direction, PriceSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getQuotes } from "@/lib/prices";

export interface UserLite {
  id: string;
  wallet: string;
  displayName: string | null;
}

export interface CallCardData {
  id: string;
  author: UserLite;
  asset: { symbol: string; name: string; category: AssetCategory; decimals: number; source: PriceSource; sourceId: string; coingeckoId: string | null };
  direction: Direction;
  level: number;
  expiresAt: string;
  createdAt: string;
  priceAtPost: number;
  status: CallStatus;
  resolvedAt: string | null;
  resolvedPrice: number | null;
  resolvedSource: PriceSource | null;
  resolvedPriceAt: string | null;
  upvoteCount: number;
  buyThroughCount: number;
  backers: UserLite[];
  viewerUpvoted: boolean;
  viewerBacked: boolean;
  currentPrice: number | null;
}

const callInclude = (viewerId?: string | null) =>
  ({
    author: { select: { id: true, wallet: true, displayName: true } },
    asset: true,
    buyThroughs: { include: { user: { select: { id: true, wallet: true, displayName: true } } }, orderBy: { createdAt: "asc" } },
    _count: { select: { upvotes: true, buyThroughs: true } },
    upvotes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
  }) satisfies Prisma.CallInclude;

type CallRow = Prisma.CallGetPayload<{ include: ReturnType<typeof callInclude> }>;

function toCard(c: CallRow, viewerId: string | null | undefined, price: number | null): CallCardData {
  const upvotes = (c as unknown as { upvotes?: { id: string }[] }).upvotes;
  return {
    id: c.id,
    author: c.author,
    asset: {
      symbol: c.asset.symbol,
      name: c.asset.name,
      category: c.asset.category,
      decimals: c.asset.decimals,
      source: c.asset.source,
      sourceId: c.asset.sourceId,
      coingeckoId: c.asset.coingeckoId,
    },
    direction: c.direction,
    level: Number(c.level),
    expiresAt: c.expiresAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    priceAtPost: Number(c.priceAtPost),
    status: c.status,
    resolvedAt: c.resolvedAt?.toISOString() ?? null,
    resolvedPrice: c.resolvedPrice == null ? null : Number(c.resolvedPrice),
    resolvedSource: c.resolvedSource ?? null,
    resolvedPriceAt: c.resolvedPriceAt?.toISOString() ?? null,
    upvoteCount: c._count.upvotes,
    buyThroughCount: c._count.buyThroughs,
    backers: c.buyThroughs.map((b) => b.user),
    viewerUpvoted: !!upvotes?.length,
    viewerBacked: viewerId ? c.buyThroughs.some((b) => b.userId === viewerId) : false,
    currentPrice: price,
  };
}

async function attachPrices(rows: CallRow[], viewerId?: string | null): Promise<CallCardData[]> {
  const liveAssets = new Map<string, CallRow["asset"]>();
  for (const r of rows) if (r.status === "LIVE") liveAssets.set(r.asset.symbol, r.asset);
  const quotes = await getQuotes([...liveAssets.values()]);
  return rows.map((r) => toCard(r, viewerId, quotes[r.asset.symbol]?.price ?? null));
}

export type FeedTab = "all" | "following" | "live" | "played_out" | "missed";

export async function getFeed(opts: { tab: FeedTab; viewerId?: string | null; take?: number; cursor?: string | null }) {
  const take = Math.min(opts.take ?? 30, 60);
  const where: Prisma.CallWhereInput = { status: { not: "DELETED" } };
  if (opts.tab === "live") where.status = "LIVE";
  if (opts.tab === "played_out") where.status = "PLAYED_OUT";
  if (opts.tab === "missed") where.status = "MISSED";
  if (opts.tab === "following") {
    if (!opts.viewerId) return { calls: [], nextCursor: null };
    where.author = { followers: { some: { followerId: opts.viewerId } } };
  }
  const rows = await prisma.call.findMany({
    where,
    include: callInclude(opts.viewerId),
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return { calls: await attachPrices(page, opts.viewerId), nextCursor: hasMore ? page[page.length - 1].id : null };
}

export async function getCallsByAuthor(authorId: string, viewerId?: string | null) {
  const rows = await prisma.call.findMany({
    where: { authorId, status: { not: "DELETED" } },
    include: callInclude(viewerId),
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return attachPrices(rows, viewerId);
}

export async function getCallsBackedBy(userId: string, viewerId?: string | null) {
  const rows = await prisma.call.findMany({
    where: { status: { not: "DELETED" }, buyThroughs: { some: { userId } } },
    include: callInclude(viewerId),
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return attachPrices(rows, viewerId);
}

export async function getCallById(id: string, viewerId?: string | null): Promise<CallCardData | null> {
  const row = await prisma.call.findUnique({ where: { id }, include: callInclude(viewerId) });
  if (!row || row.status === "DELETED") return null;
  const [card] = await attachPrices([row], viewerId);
  return card;
}

export async function getRecentCalls(take = 6, viewerId?: string | null) {
  const rows = await prisma.call.findMany({
    where: { status: { not: "DELETED" } },
    include: callInclude(viewerId),
    orderBy: { createdAt: "desc" },
    take,
  });
  return attachPrices(rows, viewerId);
}

export interface SiteStats {
  callsLive: number;
  callsTotal: number;
  callsPlayedOut: number;
  pointsAwarded: number;
  pointsPaid: number;
  walletsPaid: number;
  wallets: number;
}

export async function getSiteStats(): Promise<SiteStats> {
  const [callsLive, callsTotal, callsPlayedOut, awarded, paid, walletsPaid, wallets] = await Promise.all([
    prisma.call.count({ where: { status: "LIVE" } }),
    prisma.call.count({ where: { status: { not: "DELETED" } } }),
    prisma.call.count({ where: { status: "PLAYED_OUT" } }),
    prisma.ledgerEntry.aggregate({ where: { delta: { gt: 0 } }, _sum: { delta: true } }),
    prisma.payout.aggregate({ _sum: { points: true } }),
    prisma.payout.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.user.count(),
  ]);
  return {
    callsLive,
    callsTotal,
    callsPlayedOut,
    pointsAwarded: awarded._sum.delta ?? 0,
    pointsPaid: paid._sum.points ?? 0,
    walletsPaid: walletsPaid.length,
    wallets,
  };
}

export type Period = "week" | "month" | "all";

export function periodStart(period: Period, now = new Date()): Date | null {
  if (period === "week") return new Date(now.getTime() - 7 * 86_400_000);
  if (period === "month") return new Date(now.getTime() - 30 * 86_400_000);
  return null;
}

export interface LeaderboardRow {
  rank: number;
  user: UserLite;
  points: number;
  callsPosted: number;
  playedOut: number;
  missed: number;
  winRate: number | null;
}

export async function getLeaderboard(period: Period, limit = 100): Promise<LeaderboardRow[]> {
  const since = periodStart(period);
  const ledgerWhere: Prisma.LedgerEntryWhereInput = since ? { createdAt: { gte: since } } : {};
  const points = await prisma.ledgerEntry.groupBy({
    by: ["userId"],
    where: ledgerWhere,
    _sum: { delta: true },
  });
  const pointsMap = new Map(points.map((p) => [p.userId, p._sum.delta ?? 0]));

  const callWhere: Prisma.CallWhereInput = {
    status: { not: "DELETED" },
    ...(since ? { createdAt: { gte: since } } : {}),
  };
  const calls = await prisma.call.groupBy({ by: ["authorId", "status"], where: callWhere, _count: { _all: true } });
  const callStats = new Map<string, { posted: number; playedOut: number; missed: number }>();
  for (const row of calls) {
    const s = callStats.get(row.authorId) ?? { posted: 0, playedOut: 0, missed: 0 };
    s.posted += row._count._all;
    if (row.status === "PLAYED_OUT") s.playedOut += row._count._all;
    if (row.status === "MISSED") s.missed += row._count._all;
    callStats.set(row.authorId, s);
  }

  const userIds = new Set([...pointsMap.keys(), ...callStats.keys()]);
  if (!userIds.size) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds] } },
    select: { id: true, wallet: true, displayName: true },
  });

  const rows = users.map((u) => {
    const s = callStats.get(u.id) ?? { posted: 0, playedOut: 0, missed: 0 };
    const resolved = s.playedOut + s.missed;
    return {
      rank: 0,
      user: u,
      points: pointsMap.get(u.id) ?? 0,
      callsPosted: s.posted,
      playedOut: s.playedOut,
      missed: s.missed,
      winRate: resolved ? s.playedOut / resolved : null,
    };
  });
  rows.sort((a, b) => b.points - a.points || b.playedOut - a.playedOut || a.callsPosted - b.callsPosted);
  return rows.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}

export interface ProfileData {
  user: UserLite & { createdAt: string; isFlagged: boolean };
  points: number;
  unpaid: number;
  callsPosted: number;
  playedOut: number;
  missed: number;
  live: number;
  winRate: number | null;
  followers: number;
  following: number;
  viewerFollows: boolean;
  payouts: Array<{ id: string; points: number; amount: string; token: string; txSignature: string; paidAt: string }>;
  ledger: Array<{ id: string; delta: number; reason: string; note: string | null; createdAt: string; callId: string | null; paid: boolean }>;
}

export async function getProfile(wallet: string, viewerId?: string | null): Promise<ProfileData | null> {
  const user = await prisma.user.findUnique({ where: { wallet } });
  if (!user) return null;
  const [pointsAgg, unpaidAgg, byStatus, followers, following, viewerFollow, payouts, ledger] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { userId: user.id }, _sum: { delta: true } }),
    prisma.ledgerEntry.aggregate({ where: { userId: user.id, payoutId: null }, _sum: { delta: true } }),
    prisma.call.groupBy({ by: ["status"], where: { authorId: user.id, status: { not: "DELETED" } }, _count: { _all: true } }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    viewerId
      ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: user.id } } })
      : Promise.resolve(null),
    prisma.payout.findMany({ where: { userId: user.id }, orderBy: { paidAt: "desc" } }),
    prisma.ledgerEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const count = (s: CallStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const playedOut = count("PLAYED_OUT");
  const missed = count("MISSED");
  const live = count("LIVE");
  return {
    user: { id: user.id, wallet: user.wallet, displayName: user.displayName, createdAt: user.createdAt.toISOString(), isFlagged: user.isFlagged },
    points: pointsAgg._sum.delta ?? 0,
    unpaid: unpaidAgg._sum.delta ?? 0,
    callsPosted: playedOut + missed + live,
    playedOut,
    missed,
    live,
    winRate: playedOut + missed ? playedOut / (playedOut + missed) : null,
    followers,
    following,
    viewerFollows: !!viewerFollow,
    payouts: payouts.map((p) => ({
      id: p.id,
      points: p.points,
      amount: p.amount.toString(),
      token: p.token,
      txSignature: p.txSignature,
      paidAt: p.paidAt.toISOString(),
    })),
    ledger: ledger.map((l) => ({
      id: l.id,
      delta: l.delta,
      reason: l.reason,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
      callId: l.callId,
      paid: !!l.payoutId,
    })),
  };
}

export async function getActiveAssets() {
  return prisma.asset.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
}
