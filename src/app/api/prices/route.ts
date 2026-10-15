import { prisma } from "@/lib/prisma";
import { handler, json, ApiError } from "@/lib/api";
import { getQuote, getSparkline } from "@/lib/prices";

/**
 * GET /api/prices?symbol=BTC            → current quote
 * GET /api/prices?symbol=BTC&spark=1    → quote + sparkline points
 * GET /api/prices?symbols=BTC,ETH,SOL   → quotes for several symbols
 */
export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const symbols = url.searchParams.get("symbols");
  if (symbols) {
    const list = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 40);
    const assets = await prisma.asset.findMany({ where: { symbol: { in: list } } });
    const out: Record<string, { price: number; at: string; source: string }> = {};
    await Promise.all(
      assets.map(async (a) => {
        try {
          const q = await getQuote(a);
          out[a.symbol] = { price: q.price, at: q.at.toISOString(), source: q.source };
        } catch {
          /* omit */
        }
      }),
    );
    return json({ quotes: out });
  }

  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) throw new ApiError("symbol is required");
  const asset = await prisma.asset.findUnique({ where: { symbol } });
  if (!asset) throw new ApiError("Unknown asset", 404);

  const wantSpark = url.searchParams.get("spark") === "1";
  const [quote, spark] = await Promise.all([
    getQuote(asset),
    wantSpark ? getSparkline(asset).catch(() => null) : Promise.resolve(null),
  ]);
  return json(
    {
      symbol,
      price: quote.price,
      at: quote.at.toISOString(),
      source: quote.source,
      decimals: asset.decimals,
      sparkline: spark?.points ?? null,
    },
    { headers: { "cache-control": "public, s-maxage=15, stale-while-revalidate=30" } },
  );
});
