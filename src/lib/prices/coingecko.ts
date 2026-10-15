import { env } from "@/lib/env";
import { PriceFeedError, type Quote, type Range, type Sparkline } from "./types";

function base() {
  return env.coingeckoPro ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
}

function headers(): Record<string, string> {
  if (!env.coingeckoKey) return {};
  return env.coingeckoPro
    ? { "x-cg-pro-api-key": env.coingeckoKey }
    : { "x-cg-demo-api-key": env.coingeckoKey };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    headers: headers(),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new PriceFeedError("COINGECKO", `HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function coingeckoQuote(id: string): Promise<Quote> {
  const data = await get<Record<string, { usd: number; last_updated_at?: number }>>(
    `/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd&include_last_updated_at=true`,
  );
  const row = data[id];
  if (!row || !Number.isFinite(row.usd)) throw new PriceFeedError("COINGECKO", `no price for ${id}`);
  return {
    price: row.usd,
    at: row.last_updated_at ? new Date(row.last_updated_at * 1000) : new Date(),
    source: "COINGECKO",
  };
}

/** One request for many ids (CoinGecko's free tier is tight on requests/minute). */
export async function coingeckoQuotes(ids: string[]): Promise<Record<string, Quote>> {
  if (!ids.length) return {};
  const data = await get<Record<string, { usd: number; last_updated_at?: number }>>(
    `/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd&include_last_updated_at=true`,
  );
  const out: Record<string, Quote> = {};
  for (const id of ids) {
    const row = data[id];
    if (!row || !Number.isFinite(row.usd)) continue;
    out[id] = {
      price: row.usd,
      at: row.last_updated_at ? new Date(row.last_updated_at * 1000) : new Date(),
      source: "COINGECKO",
    };
  }
  return out;
}

/** CoinGecko only gives us ~5-minute granularity for the last day; good enough as a fallback range. */
export async function coingeckoRangeSince(id: string, since: Date): Promise<Range | null> {
  const data = await get<{ prices: [number, number][] }>(
    `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=1`,
  );
  const pts = data.prices.filter(([t]) => t >= since.getTime());
  if (!pts.length) return null;
  let high = -Infinity;
  let low = Infinity;
  for (const [, p] of pts) {
    high = Math.max(high, p);
    low = Math.min(low, p);
  }
  return { high, low, from: new Date(pts[0][0]), to: new Date(pts[pts.length - 1][0]), source: "COINGECKO" };
}

export async function coingeckoSparkline(id: string): Promise<Sparkline> {
  const data = await get<{ prices: [number, number][] }>(
    `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=2`,
  );
  // Downsample to ~48 points so the mini chart stays light.
  const step = Math.max(1, Math.floor(data.prices.length / 48));
  const sampled = data.prices.filter((_, i) => i % step === 0);
  return {
    points: sampled.map(([, p]) => p),
    from: new Date(sampled[0]?.[0] ?? Date.now()),
    to: new Date(sampled[sampled.length - 1]?.[0] ?? Date.now()),
    source: "COINGECKO",
  };
}
