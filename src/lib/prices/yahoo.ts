import { PriceFeedError, type Quote, type Range, type Sparkline } from "./types";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const UA = "Mozilla/5.0 (compatible; CalledBot/1.0)";

interface YahooChart {
  chart: {
    result?: Array<{
      meta: { regularMarketPrice?: number; regularMarketTime?: number; currency?: string };
      timestamp?: number[];
      indicators: { quote: Array<{ close?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[] }> };
    }>;
    error?: { description?: string } | null;
  };
}

async function chart(symbol: string, range: string, interval: string): Promise<YahooChart["chart"]["result"]> {
  let lastErr: unknown;
  for (const host of HOSTS) {
    try {
      const res = await fetch(
        `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`,
        { headers: { "user-agent": UA, accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const data = (await res.json()) as YahooChart;
      if (data.chart.error) throw new Error(data.chart.error.description ?? "chart error");
      return data.chart.result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new PriceFeedError("YAHOO", lastErr instanceof Error ? lastErr.message : "unreachable");
}

export async function yahooQuote(symbol: string): Promise<Quote> {
  const result = await chart(symbol, "1d", "5m");
  const meta = result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (!price || !Number.isFinite(price)) throw new PriceFeedError("YAHOO", `no price for ${symbol}`);
  return {
    price,
    at: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date(),
    source: "YAHOO",
  };
}

export async function yahooRangeSince(symbol: string, since: Date): Promise<Range | null> {
  const result = await chart(symbol, "5d", "1m");
  const r = result?.[0];
  if (!r?.timestamp) return null;
  const q = r.indicators.quote[0];
  let high = -Infinity;
  let low = Infinity;
  let from: number | null = null;
  let to: number | null = null;
  r.timestamp.forEach((t, i) => {
    const ms = t * 1000;
    if (ms < since.getTime()) return;
    const h = q.high?.[i];
    const l = q.low?.[i];
    if (h == null || l == null) return;
    high = Math.max(high, h);
    low = Math.min(low, l);
    from ??= ms;
    to = ms;
  });
  if (from === null || to === null) return null;
  return { high, low, from: new Date(from), to: new Date(to), source: "YAHOO" };
}

export async function yahooSparkline(symbol: string): Promise<Sparkline> {
  const result = await chart(symbol, "5d", "1h");
  const r = result?.[0];
  const closes = (r?.indicators.quote[0]?.close ?? []).filter((c): c is number => c != null);
  const ts = r?.timestamp ?? [];
  return {
    points: closes,
    from: new Date((ts[0] ?? Date.now() / 1000) * 1000),
    to: new Date((ts[ts.length - 1] ?? Date.now() / 1000) * 1000),
    source: "YAHOO",
  };
}
