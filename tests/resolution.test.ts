import { describe, expect, it } from "vitest";
import {
  crossesLevel,
  distanceToLevelPct,
  evaluateCall,
  expiryIsValid,
  levelIsOnCorrectSide,
  MIN_CALL_DURATION_MS,
  MAX_CALL_DURATION_MS,
} from "@/lib/resolution";

const T0 = new Date("2026-10-15T12:00:00Z");
const EXP = new Date("2026-10-16T12:00:00Z");
const before = new Date(EXP.getTime() - 60_000);
const after = new Date(EXP.getTime() + 60_000);

const above = { direction: "ABOVE" as const, level: 100, expiresAt: EXP };
const below = { direction: "BELOW" as const, level: 100, expiresAt: EXP };

describe("crossesLevel", () => {
  it("ABOVE: price at or over the level counts", () => {
    expect(crossesLevel(above, { price: 100, at: T0 })).toBe(true);
    expect(crossesLevel(above, { price: 100.01, at: T0 })).toBe(true);
    expect(crossesLevel(above, { price: 99.99, at: T0 })).toBe(false);
  });
  it("BELOW: price at or under the level counts", () => {
    expect(crossesLevel(below, { price: 100, at: T0 })).toBe(true);
    expect(crossesLevel(below, { price: 99.5, at: T0 })).toBe(true);
    expect(crossesLevel(below, { price: 100.5, at: T0 })).toBe(false);
  });
  it("uses the interval high/low when provided (wick between checks)", () => {
    expect(crossesLevel(above, { price: 95, high: 101, low: 90, at: T0 })).toBe(true);
    expect(crossesLevel(below, { price: 105, high: 110, low: 99, at: T0 })).toBe(true);
    expect(crossesLevel(above, { price: 95, high: 99, low: 90, at: T0 })).toBe(false);
  });
});

describe("evaluateCall", () => {
  it("plays out when crossed before expiry", () => {
    expect(evaluateCall(above, { price: 101, at: before }, before)).toBe("PLAYED_OUT");
    expect(evaluateCall(below, { price: 99, at: before }, before)).toBe("PLAYED_OUT");
  });
  it("stays live when not crossed and not expired", () => {
    expect(evaluateCall(above, { price: 99, at: before }, before)).toBe("LIVE");
    expect(evaluateCall(below, { price: 101, at: before }, before)).toBe("LIVE");
  });
  it("is missed once expiry passes without a cross", () => {
    expect(evaluateCall(above, { price: 99, at: after }, after)).toBe("MISSED");
    expect(evaluateCall(below, { price: 101, at: after }, after)).toBe("MISSED");
  });
  it("edge: observation exactly at expiry counts", () => {
    expect(evaluateCall(above, { price: 100, at: EXP }, EXP)).toBe("PLAYED_OUT");
  });
  it("edge: now exactly at expiry with no cross is missed", () => {
    expect(evaluateCall(above, { price: 99, at: EXP }, EXP)).toBe("MISSED");
  });
  it("edge: a cross observed after expiry does not count", () => {
    expect(evaluateCall(above, { price: 150, at: after }, after)).toBe("MISSED");
  });
  it("edge: cross observed before expiry while evaluated after expiry still plays out", () => {
    // e.g. the cron ran late but the high/low window ended before expiry
    expect(evaluateCall(above, { price: 150, at: before }, after)).toBe("PLAYED_OUT");
  });
  it("edge: a wick that touched the level before expiry plays out even if spot is back below", () => {
    expect(evaluateCall(above, { price: 98, high: 100, low: 97, at: before }, before)).toBe("PLAYED_OUT");
  });
});

describe("levelIsOnCorrectSide", () => {
  it("ABOVE requires level strictly above price", () => {
    expect(levelIsOnCorrectSide("ABOVE", 101, 100)).toBe(true);
    expect(levelIsOnCorrectSide("ABOVE", 100, 100)).toBe(false);
    expect(levelIsOnCorrectSide("ABOVE", 99, 100)).toBe(false);
  });
  it("BELOW requires level strictly below price", () => {
    expect(levelIsOnCorrectSide("BELOW", 99, 100)).toBe(true);
    expect(levelIsOnCorrectSide("BELOW", 100, 100)).toBe(false);
    expect(levelIsOnCorrectSide("BELOW", 101, 100)).toBe(false);
  });
  it("rejects non-finite or non-positive levels", () => {
    expect(levelIsOnCorrectSide("ABOVE", NaN, 100)).toBe(false);
    expect(levelIsOnCorrectSide("BELOW", 0, 100)).toBe(false);
    expect(levelIsOnCorrectSide("BELOW", -5, 100)).toBe(false);
  });
});

describe("expiryIsValid", () => {
  it("rejects past, too-soon and too-far expiries", () => {
    expect(expiryIsValid(new Date(T0.getTime() - 1), T0).ok).toBe(false);
    expect(expiryIsValid(new Date(T0.getTime() + MIN_CALL_DURATION_MS - 1), T0).ok).toBe(false);
    expect(expiryIsValid(new Date(T0.getTime() + MAX_CALL_DURATION_MS + 1), T0).ok).toBe(false);
    expect(expiryIsValid(new Date(NaN), T0).ok).toBe(false);
  });
  it("accepts the boundaries", () => {
    expect(expiryIsValid(new Date(T0.getTime() + MIN_CALL_DURATION_MS), T0).ok).toBe(true);
    expect(expiryIsValid(new Date(T0.getTime() + MAX_CALL_DURATION_MS), T0).ok).toBe(true);
  });
});

describe("distanceToLevelPct", () => {
  it("is positive when the level is still ahead, negative once through", () => {
    expect(distanceToLevelPct("ABOVE", 110, 100)).toBeCloseTo(10);
    expect(distanceToLevelPct("ABOVE", 90, 100)).toBeCloseTo(-10);
    expect(distanceToLevelPct("BELOW", 90, 100)).toBeCloseTo(10);
    expect(distanceToLevelPct("BELOW", 110, 100)).toBeCloseTo(-10);
  });
});
