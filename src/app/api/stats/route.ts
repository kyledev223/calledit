import { prisma } from "@/lib/prisma";
import { handler, json } from "@/lib/api";
import { getSiteStats } from "@/lib/queries";
import { getQuote } from "@/lib/prices";

export const dynamic = "force-dynamic";

/** Lightweight stats for the nav pill and the live panel. */
export const GET = handler(async () => {
  const [stats, btc] = await Promise.all([
    getSiteStats(),
    prisma.asset
      .findUnique({ where: { symbol: "BTC" } })
      .then((a) => (a ? getQuote(a) : null))
      .catch(() => null),
  ]);
  return json(
    { ...stats, btc: btc ? { price: btc.price, at: btc.at.toISOString() } : null },
    { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=40" } },
  );
});
