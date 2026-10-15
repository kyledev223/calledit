import { PriceFeedError, type Quote, type Range, type Sparkline } from "./types";

// api.binance.com is geo-blocked in some regions (HTTP 451). We try the
// alternate data-only hosts before giving up so the CoinGecko fallback kicks in.
const HOSTS = ["https://api.binance.com", "https://data-api.binance.vision", "https://api1.binance.com"];

async function get<T>(path: string): Promise<T> {
  let lastErr: unknown;
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        if (res.status === 400) break; // bad symbol; no point trying other hosts
        continue;
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new PriceFeedError("BINANCE", lastErr instanceof Error ? lastErr.message : "unreachable");
}

export async function binanceQuote(pair: string): Promise<Quote> {
  const data = await get<{ symbol: string; price: string }>(`/api/v3/ticker/price?symbol=${pair}`);
  const price = Number(data.price);
  if (!Number.isFinite(price)) throw new PriceFeedError("BINANCE", "bad price");
  return { price, at: new Date(), source: "BINANCE" };
}

type Kline = [number, string, string, string, string, string, number, ...unknown[]];

/** High/low of 1-minute candles from `since` to now (max ~16h per request). */
export async function binanceRangeSince(pair: string, since: Date): Promise<Range | null> {
  const start = Math.max(since.getTime(), Date.now() - 1000 * 60 * 1000);
  const klines = await get<Kline[]>(
    `/api/v3/klines?symbol=${pair}&interval=1m&startTime=${start}&limit=1000`,
  );
  if (!klines.length) return null;
  let high = -Infinity;
  let low = Infinity;
  for (const k of klines) {
    high = Math.max(high, Number(k[2]));
    low = Math.min(low, Number(k[3]));
  }
  return {
    high,
    low,
    from: new Date(klines[0][0]),
    to: new Date(klines[klines.length - 1][6]),
    source: "BINANCE",
  };
}

export async function binanceSparkline(pair: string): Promise<Sparkline> {
  const klines = await get<Kline[]>(`/api/v3/klines?symbol=${pair}&interval=1h&limit=48`);
  return {
    points: klines.map((k) => Number(k[4])),
    from: new Date(klines[0]?.[0] ?? Date.now()),
    to: new Date(klines[klines.length - 1]?.[6] ?? Date.now()),
    source: "BINANCE",
  };
}
