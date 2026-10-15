import type { AssetCategory, PriceSource } from "@prisma/client";

export interface AssetSeed {
  symbol: string;
  name: string;
  category: AssetCategory;
  source: PriceSource;
  sourceId: string;
  coingeckoId?: string;
  decimals: number;
  sortOrder: number;
}

/**
 * The asset catalog seeded into the Asset table. Add rows here and re-run the
 * seed (it upserts by symbol). Prices are routed by `source`:
 *   BINANCE   → USDT spot pair         (crypto)
 *   COINGECKO → coin id                (memecoins, and crypto fallback)
 *   YAHOO     → ticker                 (TradFi)
 */
export const ASSET_CATALOG: AssetSeed[] = [
  // Crypto
  { symbol: "BTC", name: "Bitcoin", category: "CRYPTO", source: "BINANCE", sourceId: "BTCUSDT", coingeckoId: "bitcoin", decimals: 2, sortOrder: 1 },
  { symbol: "ETH", name: "Ethereum", category: "CRYPTO", source: "BINANCE", sourceId: "ETHUSDT", coingeckoId: "ethereum", decimals: 2, sortOrder: 2 },
  { symbol: "SOL", name: "Solana", category: "CRYPTO", source: "BINANCE", sourceId: "SOLUSDT", coingeckoId: "solana", decimals: 2, sortOrder: 3 },
  { symbol: "BNB", name: "BNB", category: "CRYPTO", source: "BINANCE", sourceId: "BNBUSDT", coingeckoId: "binancecoin", decimals: 2, sortOrder: 4 },
  { symbol: "XRP", name: "XRP", category: "CRYPTO", source: "BINANCE", sourceId: "XRPUSDT", coingeckoId: "ripple", decimals: 4, sortOrder: 5 },
  { symbol: "DOGE", name: "Dogecoin", category: "CRYPTO", source: "BINANCE", sourceId: "DOGEUSDT", coingeckoId: "dogecoin", decimals: 4, sortOrder: 6 },
  { symbol: "ADA", name: "Cardano", category: "CRYPTO", source: "BINANCE", sourceId: "ADAUSDT", coingeckoId: "cardano", decimals: 4, sortOrder: 7 },
  { symbol: "AVAX", name: "Avalanche", category: "CRYPTO", source: "BINANCE", sourceId: "AVAXUSDT", coingeckoId: "avalanche-2", decimals: 2, sortOrder: 8 },
  { symbol: "LINK", name: "Chainlink", category: "CRYPTO", source: "BINANCE", sourceId: "LINKUSDT", coingeckoId: "chainlink", decimals: 2, sortOrder: 9 },
  { symbol: "SUI", name: "Sui", category: "CRYPTO", source: "BINANCE", sourceId: "SUIUSDT", coingeckoId: "sui", decimals: 3, sortOrder: 10 },
  { symbol: "HYPE", name: "Hyperliquid", category: "CRYPTO", source: "COINGECKO", sourceId: "hyperliquid", coingeckoId: "hyperliquid", decimals: 2, sortOrder: 11 },

  // TradFi (Yahoo Finance tickers)
  { symbol: "SPY", name: "S&P 500 ETF", category: "TRADFI", source: "YAHOO", sourceId: "SPY", decimals: 2, sortOrder: 20 },
  { symbol: "QQQ", name: "Nasdaq 100 ETF", category: "TRADFI", source: "YAHOO", sourceId: "QQQ", decimals: 2, sortOrder: 21 },
  { symbol: "NVDA", name: "NVIDIA", category: "TRADFI", source: "YAHOO", sourceId: "NVDA", decimals: 2, sortOrder: 22 },
  { symbol: "AAPL", name: "Apple", category: "TRADFI", source: "YAHOO", sourceId: "AAPL", decimals: 2, sortOrder: 23 },
  { symbol: "TSLA", name: "Tesla", category: "TRADFI", source: "YAHOO", sourceId: "TSLA", decimals: 2, sortOrder: 24 },
  { symbol: "MSFT", name: "Microsoft", category: "TRADFI", source: "YAHOO", sourceId: "MSFT", decimals: 2, sortOrder: 25 },
  { symbol: "AMZN", name: "Amazon", category: "TRADFI", source: "YAHOO", sourceId: "AMZN", decimals: 2, sortOrder: 26 },
  { symbol: "META", name: "Meta", category: "TRADFI", source: "YAHOO", sourceId: "META", decimals: 2, sortOrder: 27 },
  { symbol: "COIN", name: "Coinbase", category: "TRADFI", source: "YAHOO", sourceId: "COIN", decimals: 2, sortOrder: 28 },
  { symbol: "GOLD", name: "Gold (futures)", category: "TRADFI", source: "YAHOO", sourceId: "GC=F", decimals: 2, sortOrder: 29 },
  { symbol: "OIL", name: "Crude oil (WTI)", category: "TRADFI", source: "YAHOO", sourceId: "CL=F", decimals: 2, sortOrder: 30 },

  // Memecoins (CoinGecko ids)
  { symbol: "WIF", name: "dogwifhat", category: "MEMECOIN", source: "COINGECKO", sourceId: "dogwifcoin", decimals: 4, sortOrder: 40 },
  { symbol: "BONK", name: "Bonk", category: "MEMECOIN", source: "COINGECKO", sourceId: "bonk", decimals: 8, sortOrder: 41 },
  { symbol: "PEPE", name: "Pepe", category: "MEMECOIN", source: "COINGECKO", sourceId: "pepe", decimals: 8, sortOrder: 42 },
  { symbol: "SHIB", name: "Shiba Inu", category: "MEMECOIN", source: "COINGECKO", sourceId: "shiba-inu", decimals: 8, sortOrder: 43 },
  { symbol: "POPCAT", name: "Popcat", category: "MEMECOIN", source: "COINGECKO", sourceId: "popcat", decimals: 4, sortOrder: 44 },
  { symbol: "FARTCOIN", name: "Fartcoin", category: "MEMECOIN", source: "COINGECKO", sourceId: "fartcoin", decimals: 4, sortOrder: 45 },
  { symbol: "PENGU", name: "Pudgy Penguins", category: "MEMECOIN", source: "COINGECKO", sourceId: "pudgy-penguins", decimals: 5, sortOrder: 46 },
  { symbol: "TRUMP", name: "Official Trump", category: "MEMECOIN", source: "COINGECKO", sourceId: "official-trump", decimals: 3, sortOrder: 47 },
  { symbol: "MOODENG", name: "Moo Deng", category: "MEMECOIN", source: "COINGECKO", sourceId: "moo-deng", decimals: 4, sortOrder: 48 },
  { symbol: "PNUT", name: "Peanut the Squirrel", category: "MEMECOIN", source: "COINGECKO", sourceId: "peanut-the-squirrel", decimals: 4, sortOrder: 49 },
  { symbol: "FLOKI", name: "Floki", category: "MEMECOIN", source: "COINGECKO", sourceId: "floki", decimals: 7, sortOrder: 50 },
];

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  CRYPTO: "Crypto",
  TRADFI: "TradFi",
  MEMECOIN: "Memecoins",
};

export const SOURCE_LABEL: Record<PriceSource, string> = {
  BINANCE: "Binance",
  COINGECKO: "CoinGecko",
  YAHOO: "Yahoo Finance",
};
