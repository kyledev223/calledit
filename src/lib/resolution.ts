/**
 * Pure resolution rules. No I/O here so they can be tested exhaustively.
 *
 * A call "plays out" if the price touches or trades through the level at any
 * observation whose timestamp is at or before expiry. If expiry passes without
 * that, the call is "missed". Observations after expiry never count.
 */
export type Direction = "ABOVE" | "BELOW";
export type Outcome = "PLAYED_OUT" | "MISSED" | "LIVE";

export interface ResolvableCall {
  direction: Direction;
  level: number;
  expiresAt: Date;
}

export interface Observation {
  /** Latest price. */
  price: number;
  /** Optional high/low covering the window since the last check. */
  high?: number;
  low?: number;
  /** When the observation (or the end of the window) happened. */
  at: Date;
}

/** Did this observation touch/cross the level? */
export function crossesLevel(call: Pick<ResolvableCall, "direction" | "level">, obs: Observation): boolean {
  if (call.direction === "ABOVE") {
    const max = Math.max(obs.price, obs.high ?? -Infinity);
    return max >= call.level;
  }
  const min = Math.min(obs.price, obs.low ?? Infinity);
  return min <= call.level;
}

/**
 * Decide the outcome of a call given an observation and the current time.
 * `now` is passed in (not read from the clock) for determinism.
 */
export function evaluateCall(call: ResolvableCall, obs: Observation, now: Date): Outcome {
  const exp = call.expiresAt.getTime();
  const observedInTime = obs.at.getTime() <= exp;
  if (observedInTime && crossesLevel(call, obs)) return "PLAYED_OUT";
  if (now.getTime() >= exp) return "MISSED";
  return "LIVE";
}

/**
 * Posting-time validation: the level must sit on the far side of the current
 * price (strictly), otherwise the call would be instantly "played out".
 */
export function levelIsOnCorrectSide(direction: Direction, level: number, currentPrice: number): boolean {
  if (!Number.isFinite(level) || !Number.isFinite(currentPrice) || level <= 0) return false;
  return direction === "ABOVE" ? level > currentPrice : level < currentPrice;
}

export const MIN_CALL_DURATION_MS = 10 * 60 * 1000; // at least 10 minutes out
export const MAX_CALL_DURATION_MS = 366 * 24 * 60 * 60 * 1000; // at most ~1 year

export function expiryIsValid(expiresAt: Date, now: Date): { ok: true } | { ok: false; reason: string } {
  const delta = expiresAt.getTime() - now.getTime();
  if (!Number.isFinite(delta)) return { ok: false, reason: "Invalid expiry." };
  if (delta < MIN_CALL_DURATION_MS) return { ok: false, reason: "Expiry must be at least 10 minutes from now." };
  if (delta > MAX_CALL_DURATION_MS) return { ok: false, reason: "Expiry can be at most one year out." };
  return { ok: true };
}

/** Signed % distance from current price to the level, in the direction of the call. */
export function distanceToLevelPct(direction: Direction, level: number, price: number): number {
  if (!price) return 0;
  const raw = ((level - price) / price) * 100;
  return direction === "ABOVE" ? raw : -raw;
}
