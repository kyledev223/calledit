/* eslint-disable no-console */
import { PrismaClient, Prisma, type Direction, type PriceSource } from "@prisma/client";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { ASSET_CATALOG } from "../src/lib/assets";
import { awardForCall, reverseForCall } from "../src/lib/points";
import { getQuote } from "../src/lib/prices";

const prisma = new PrismaClient();

const H = 60 * 60 * 1000;
const D = 24 * H;
const now = Date.now();

/** Deterministic, valid Solana addresses for sample users (seeded ed25519 keys). */
function walletFromSeed(seed: string): string {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = (seed.charCodeAt(i % seed.length) * (i + 7) + i * 31) & 0xff;
  return bs58.encode(nacl.sign.keyPair.fromSeed(bytes).publicKey);
}

const SAMPLE_USERS = [
  { seed: "quietwhale", name: "quietwhale" },
  { seed: "marginal-call", name: "Marginal Call" },
  { seed: "dorothy", name: "dorothy.sol" },
  { seed: "tape-reader", name: "tape reader" },
  { seed: "noname-1", name: null },
  { seed: "pablo", name: "pablo" },
  { seed: "ferris", name: "ferris" },
  { seed: "noname-2", name: null },
];

interface CallSeed {
  author: string; // seed
  asset: string;
  direction: Direction;
  /** Absolute level. For LIVE calls this is only a fallback when the live quote is unavailable. */
  level: number;
  priceAtPost: number;
  /** LIVE calls: distance from the *current* price, e.g. 0.12 = 12% away in the call's direction. */
  levelPct?: number;
  createdAgoMs: number;
  expiresInMs: number; // relative to createdAt
  status: "LIVE" | "PLAYED_OUT" | "MISSED" | "DELETED_PLAYED_OUT";
  resolvedPrice?: number;
  resolvedAgoMs?: number;
  upvoters?: string[];
  backers?: string[];
}

const CALLS: CallSeed[] = [
  // Live (levels are set relative to the live price at seed time so they stay live)
  { author: "quietwhale", asset: "BTC", direction: "ABOVE", levelPct: 0.11, level: 125000, priceAtPost: 112400, createdAgoMs: 2 * H, expiresInMs: 7 * D, status: "LIVE", upvoters: ["dorothy", "pablo", "ferris"], backers: ["marginal-call", "tape-reader"] },
  { author: "marginal-call", asset: "SOL", direction: "BELOW", levelPct: 0.18, level: 150, priceAtPost: 186.2, createdAgoMs: 5 * H, expiresInMs: 3 * D, status: "LIVE", upvoters: ["quietwhale"], backers: ["dorothy"] },
  { author: "dorothy", asset: "NVDA", direction: "ABOVE", levelPct: 0.14, level: 210, priceAtPost: 183.5, createdAgoMs: 1 * D, expiresInMs: 30 * D, status: "LIVE", upvoters: ["pablo", "ferris", "noname-1", "tape-reader"], backers: ["pablo"] },
  { author: "pablo", asset: "WIF", direction: "ABOVE", levelPct: 0.8, level: 1.5, priceAtPost: 0.82, createdAgoMs: 40 * 60_000, expiresInMs: 14 * D, status: "LIVE", upvoters: ["noname-2"], backers: [] },
  { author: "ferris", asset: "ETH", direction: "BELOW", levelPct: 0.2, level: 3200, priceAtPost: 3980, createdAgoMs: 3 * D, expiresInMs: 3 * D + 90 * 60_000, status: "LIVE", upvoters: ["quietwhale", "dorothy"], backers: ["noname-1"] },
  { author: "tape-reader", asset: "GOLD", direction: "ABOVE", levelPct: 0.09, level: 4500, priceAtPost: 4120, createdAgoMs: 6 * H, expiresInMs: 60 * D, status: "LIVE", upvoters: [], backers: [] },
  { author: "noname-1", asset: "PEPE", direction: "BELOW", levelPct: 0.4, level: 0.000006, priceAtPost: 0.0000098, createdAgoMs: 20 * 60_000, expiresInMs: 2 * D, status: "LIVE", upvoters: ["pablo"], backers: [] },

  // Played out
  { author: "quietwhale", asset: "SOL", direction: "ABOVE", level: 180, priceAtPost: 161.4, createdAgoMs: 12 * D, expiresInMs: 10 * D, status: "PLAYED_OUT", resolvedPrice: 180.42, resolvedAgoMs: 6 * D, upvoters: ["dorothy", "pablo", "ferris", "tape-reader", "noname-2"], backers: ["marginal-call", "dorothy", "ferris"] },
  { author: "dorothy", asset: "TSLA", direction: "BELOW", level: 400, priceAtPost: 438.7, createdAgoMs: 20 * D, expiresInMs: 14 * D, status: "PLAYED_OUT", resolvedPrice: 399.8, resolvedAgoMs: 9 * D, upvoters: ["quietwhale", "pablo"], backers: ["tape-reader"] },
  { author: "marginal-call", asset: "BONK", direction: "ABOVE", level: 0.000025, priceAtPost: 0.0000191, createdAgoMs: 9 * D, expiresInMs: 7 * D, status: "PLAYED_OUT", resolvedPrice: 0.0000251, resolvedAgoMs: 4 * D, upvoters: ["ferris", "noname-1", "noname-2"], backers: ["pablo", "quietwhale"] },
  { author: "ferris", asset: "BTC", direction: "ABOVE", level: 110000, priceAtPost: 104300, createdAgoMs: 30 * D, expiresInMs: 21 * D, status: "PLAYED_OUT", resolvedPrice: 110004, resolvedAgoMs: 16 * D, upvoters: ["dorothy"], backers: [] },

  // Missed
  { author: "pablo", asset: "DOGE", direction: "ABOVE", level: 0.5, priceAtPost: 0.24, createdAgoMs: 15 * D, expiresInMs: 10 * D, status: "MISSED", resolvedPrice: 0.231, resolvedAgoMs: 5 * D, upvoters: ["noname-2"], backers: ["noname-1"] },
  { author: "tape-reader", asset: "AAPL", direction: "BELOW", level: 200, priceAtPost: 247.1, createdAgoMs: 25 * D, expiresInMs: 20 * D, status: "MISSED", resolvedPrice: 251.9, resolvedAgoMs: 5 * D, upvoters: ["marginal-call", "pablo"], backers: [] },
  { author: "noname-2", asset: "XRP", direction: "ABOVE", level: 5, priceAtPost: 2.9, createdAgoMs: 8 * D, expiresInMs: 7 * D, status: "MISSED", resolvedPrice: 2.77, resolvedAgoMs: 1 * D, upvoters: [], backers: [] },

  // Deleted after playing out (points reversed)
  { author: "marginal-call", asset: "ETH", direction: "ABOVE", level: 4000, priceAtPost: 3650, createdAgoMs: 40 * D, expiresInMs: 20 * D, status: "DELETED_PLAYED_OUT", resolvedPrice: 4001.5, resolvedAgoMs: 28 * D, upvoters: ["quietwhale", "pablo"], backers: ["dorothy"] },
];

const FOLLOWS: [string, string][] = [
  ["dorothy", "quietwhale"],
  ["pablo", "quietwhale"],
  ["ferris", "quietwhale"],
  ["quietwhale", "dorothy"],
  ["tape-reader", "dorothy"],
  ["marginal-call", "ferris"],
  ["noname-1", "pablo"],
];

async function main() {
  console.log("Seeding assets…");
  for (const a of ASSET_CATALOG) {
    await prisma.asset.upsert({
      where: { symbol: a.symbol },
      update: { name: a.name, category: a.category, source: a.source, sourceId: a.sourceId, coingeckoId: a.coingeckoId ?? null, decimals: a.decimals, sortOrder: a.sortOrder, isActive: true },
      create: { ...a, coingeckoId: a.coingeckoId ?? null },
    });
  }
  const assets = new Map((await prisma.asset.findMany()).map((a) => [a.symbol, a]));

  console.log("Seeding users…");
  const users = new Map<string, { id: string; wallet: string }>();
  for (const u of SAMPLE_USERS) {
    const wallet = walletFromSeed(u.seed);
    const row = await prisma.user.upsert({
      where: { wallet },
      update: { displayName: u.name },
      create: { wallet, displayName: u.name, createdAt: new Date(now - 45 * D) },
    });
    users.set(u.seed, { id: row.id, wallet });
  }
  const uid = (seed: string) => {
    const u = users.get(seed);
    if (!u) throw new Error(`unknown user seed ${seed}`);
    return u.id;
  };

  // Wipe sample call data so the seed is idempotent.
  const sampleUserIds = [...users.values()].map((u) => u.id);
  await prisma.payout.deleteMany({ where: { userId: { in: sampleUserIds } } });
  await prisma.ledgerEntry.deleteMany({ where: { userId: { in: sampleUserIds } } });
  await prisma.call.deleteMany({ where: { authorId: { in: sampleUserIds } } });
  await prisma.follow.deleteMany({ where: { followerId: { in: sampleUserIds } } });
  await prisma.walletLink.deleteMany({ where: { userAId: { in: sampleUserIds } } });
  await prisma.actionLog.deleteMany({ where: { userId: { in: sampleUserIds } } });

  console.log("Seeding calls…");
  for (const c of CALLS) {
    const asset = assets.get(c.asset);
    if (!asset) throw new Error(`asset ${c.asset} missing`);
    const createdAt = new Date(now - c.createdAgoMs);
    const expiresAt = new Date(createdAt.getTime() + c.expiresInMs);
    const resolved = c.status !== "LIVE";
    const resolvedAt = resolved ? new Date(now - (c.resolvedAgoMs ?? 0)) : null;
    const source: PriceSource = asset.source;

    // Live calls: anchor the level to today's price so the seed looks right on any day.
    let level = c.level;
    let priceAtPost = c.priceAtPost;
    if (c.status === "LIVE" && c.levelPct) {
      try {
        const q = await getQuote(asset);
        const sign = c.direction === "ABOVE" ? 1 : -1;
        level = Number((q.price * (1 + sign * c.levelPct)).toPrecision(4));
        priceAtPost = Number((q.price * (1 - sign * 0.004)).toPrecision(6)); // tiny drift since "posting"
      } catch {
        console.warn(`  (no live quote for ${c.asset}; using fallback level)`);
      }
    }

    const call = await prisma.call.create({
      data: {
        authorId: uid(c.author),
        assetId: asset.id,
        direction: c.direction,
        level: new Prisma.Decimal(level),
        expiresAt,
        priceAtPost: new Prisma.Decimal(priceAtPost),
        priceAtPostSource: source,
        createdAt,
        status: c.status === "LIVE" ? "LIVE" : c.status === "MISSED" ? "MISSED" : "PLAYED_OUT",
        resolvedAt,
        resolvedPrice: c.resolvedPrice != null ? new Prisma.Decimal(c.resolvedPrice) : null,
        resolvedSource: resolved ? source : null,
        resolvedPriceAt: resolvedAt ? new Date(resolvedAt.getTime() - 20_000) : null,
        lastCheckedAt: resolvedAt ?? new Date(now - 60_000),
      },
    });
    for (const s of c.upvoters ?? []) {
      await prisma.upvote.create({ data: { callId: call.id, userId: uid(s), createdAt: new Date(createdAt.getTime() + 30 * 60_000) } });
    }
    for (const s of c.backers ?? []) {
      await prisma.buyThrough.create({ data: { callId: call.id, userId: uid(s), createdAt: new Date(createdAt.getTime() + 45 * 60_000) } });
    }
    if (c.status === "PLAYED_OUT" || c.status === "DELETED_PLAYED_OUT") {
      const rows = await awardForCall(prisma, call.id);
      // Backdate the award rows to the resolution time.
      await prisma.ledgerEntry.updateMany({ where: { callId: call.id }, data: { createdAt: resolvedAt ?? new Date() } });
      console.log(`  ${c.asset} ${c.direction} ${c.level} → played out, ${rows.length} ledger rows`);
    }
    if (c.status === "DELETED_PLAYED_OUT") {
      await reverseForCall(prisma, call.id);
      await prisma.call.update({ where: { id: call.id }, data: { status: "DELETED", deletedAt: new Date(now - 2 * D) } });
      console.log(`  ${c.asset} ${c.direction} ${c.level} → deleted, awards reversed`);
    }
  }

  console.log("Seeding follows…");
  for (const [a, b] of FOLLOWS) {
    await prisma.follow.create({ data: { followerId: uid(a), followingId: uid(b) } });
  }

  console.log("Seeding payout settings + one sample payout…");
  await prisma.setting.upsert({ where: { key: "payout.rate" }, update: {}, create: { key: "payout.rate", value: "0.05" } });
  await prisma.setting.upsert({ where: { key: "payout.token" }, update: {}, create: { key: "payout.token", value: "USDC" } });

  // Pay out ferris's older BTC call so the profile shows a "Paid" row.
  const ferris = uid("ferris");
  const oldRows = await prisma.ledgerEntry.findMany({
    where: { userId: ferris, payoutId: null, createdAt: { lt: new Date(now - 10 * D) } },
  });
  const pts = oldRows.reduce((s, r) => s + r.delta, 0);
  if (pts > 0) {
    const payout = await prisma.payout.create({
      data: {
        userId: ferris,
        points: pts,
        amount: new Prisma.Decimal(pts * 0.05),
        token: "USDC",
        rate: new Prisma.Decimal(0.05),
        // Sample signature: 88 chars of base58 so it looks right; not a real tx.
        txSignature: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
        paidBy: "seed",
        note: "Sample payout from seed data",
      },
    });
    await prisma.ledgerEntry.updateMany({ where: { id: { in: oldRows.map((r) => r.id) } }, data: { payoutId: payout.id } });
  }

  console.log("Seeding anti-abuse examples…");
  const [a, b] = [uid("noname-1"), uid("noname-2")].sort();
  await prisma.walletLink.create({ data: { userAId: a, userBId: b, note: "Same funding source (sample)", createdBy: "seed" } });
  await prisma.user.update({ where: { id: uid("noname-2") }, data: { isFlagged: true, flagNote: "Sample restriction" } });

  console.log("\nDone. Sample wallets:");
  for (const [seed, u] of users) console.log(`  ${seed.padEnd(14)} ${u.wallet}`);
  console.log("\nTo use /admin, add your own wallet address to ADMIN_WALLETS in .env and sign in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
