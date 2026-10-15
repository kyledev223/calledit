import { binanceQuote, binanceRangeSince, binanceSparkline } from "./binance";
import { coingeckoQuote, coingeckoQuotes, coingeckoRangeSince, coingeckoSparkline } from "./coingecko";
import { yahooQuote, yahooRangeSince, yahooSparkline } from "./yahoo";
import { cached, peek, prime } from "./cache";
import { env } from "@/lib/env";
import type { PriceAssetRef, Quote, Range, Sparkline } from "./types";

export * from "./types";

/**
 * Routing:
 *  - CRYPTO    → Binance (USDT pair), falling back to CoinGecko by coingeckoId
 *  - MEMECOIN  → CoinGecko
 *  - TRADFI    → Yahoo Finance
 * The asset row carries `source` + `sourceId`, so routing is data-driven.
 */
export async function getQuote(asset: PriceAssetRef): Promise<Quote> {
  return cached(`quote:${asset.symbol}`, 20_000, async () => {
    switch (asset.source) {
      case "BINANCE":
        try {
          return await binanceQuote(asset.sourceId);
        } catch (e) {
          if (asset.coingeckoId) return coingeckoQuote(asset.coingeckoId);
          throw e;
        }
      case "COINGECKO":
        return coingeckoQuote(asset.sourceId);
      case "YAHOO":
        return yahooQuote(asset.sourceId);
    }
  });
}

/**
 * Highest/lowest price seen since `since`. Null when the source cannot tell us.
 * CoinGecko range lookups cost one request per asset per tick, so they are only
 * used when an API key is configured; without one the spot quote decides.
 */
export async function getRangeSince(asset: PriceAssetRef, since: Date): Promise<Range | null> {
  const cgAllowed = !!env.coingeckoKey;
  try {
    switch (asset.source) {
      case "BINANCE":
        try {
          return await binanceRangeSince(asset.sourceId, since);
        } catch {
          return cgAllowed && asset.coingeckoId ? coingeckoRangeSince(asset.coingeckoId, since) : null;
        }
      case "COINGECKO":
        return cgAllowed ? coingeckoRangeSince(asset.sourceId, since) : null;
      case "YAHOO":
        return yahooRangeSince(asset.sourceId, since);
    }
  } catch {
    return null;
  }
}

export async function getSparkline(asset: PriceAssetRef): Promise<Sparkline> {
  return cached(`spark:${asset.symbol}`, 5 * 60_000, async () => {
    switch (asset.source) {
      case "BINANCE":
        try {
          return await binanceSparkline(asset.sourceId);
        } catch (e) {
          if (asset.coingeckoId) return coingeckoSparkline(asset.coingeckoId);
          throw e;
        }
      case "COINGECKO":
        return coingeckoSparkline(asset.sourceId);
      case "YAHOO":
        return yahooSparkline(asset.sourceId);
    }
  });
}

/**
 * Best-effort quotes for many assets at once; failures are omitted.
 * CoinGecko-sourced assets that aren't cached are fetched in a single batched request.
 */
export async function getQuotes(assets: PriceAssetRef[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  const rest: PriceAssetRef[] = [];
  const cgBatch: PriceAssetRef[] = [];
  for (const a of assets) {
    const hit = peek<Quote>(`quote:${a.symbol}`);
    if (hit) out[a.symbol] = hit;
    else if (a.source === "COINGECKO") cgBatch.push(a);
    else rest.push(a);
  }
  if (cgBatch.length) {
    try {
      const quotes = await coingeckoQuotes(cgBatch.map((a) => a.sourceId));
      for (const a of cgBatch) {
        const q = quotes[a.sourceId];
        if (q) {
          out[a.symbol] = q;
          prime(`quote:${a.symbol}`, 20_000, q);
        }
      }
    } catch {
      /* omit the batch */
    }
  }
  const entries = await Promise.allSettled(rest.map(async (a) => [a.symbol, await getQuote(a)] as const));
  for (const e of entries) if (e.status === "fulfilled") out[e.value[0]] = e.value[1];
  return out;
}
