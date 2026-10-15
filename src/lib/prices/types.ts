import type { PriceSource } from "@prisma/client";

export type { PriceSource };

export interface Quote {
  price: number;
  /** When the source says this price was observed. */
  at: Date;
  source: PriceSource;
}

/** High/low over an interval. Used to detect "traded through" between cron ticks. */
export interface Range {
  high: number;
  low: number;
  /** Start/end of the window actually covered by the data. */
  from: Date;
  to: Date;
  source: PriceSource;
}

export interface Sparkline {
  points: number[];
  from: Date;
  to: Date;
  source: PriceSource;
}

export interface PriceAssetRef {
  symbol: string;
  source: PriceSource;
  sourceId: string;
  coingeckoId: string | null;
}

export class PriceFeedError extends Error {
  source: PriceSource;
  constructor(source: PriceSource, message: string) {
    super(`${source}: ${message}`);
    this.source = source;
  }
}
