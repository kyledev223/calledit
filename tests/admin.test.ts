import { describe, expect, it } from "vitest";
import { csvEscape, toCsv, tokenAmount, type UnpaidRow } from "@/lib/admin-shared";
import { isRateLimited, LIMITS } from "@/lib/ratelimit";

const row = (over: Partial<UnpaidRow>): UnpaidRow => ({
  userId: "u",
  wallet: "W",
  displayName: null,
  isFlagged: false,
  unpaid: 0,
  lifetime: 0,
  paidPoints: 0,
  ...over,
});

describe("tokenAmount", () => {
  it("multiplies and rounds to 6 decimals", () => {
    expect(tokenAmount(100, 0.05)).toBe(5);
    expect(tokenAmount(3, 0.1)).toBe(0.3);
    expect(tokenAmount(7, 0.123456789)).toBe(0.864198); // 0.864197523 rounded
  });
});

describe("toCsv", () => {
  it("includes only positive balances, with escaped names", () => {
    const csv = toCsv(
      [
        row({ wallet: "A", displayName: 'quiet, "whale"', unpaid: 40 }),
        row({ wallet: "B", displayName: null, unpaid: 0 }),
        row({ wallet: "C", displayName: "x", unpaid: -3 }),
      ],
      { rate: 0.05, token: "USDC" },
    );
    expect(csv).toBe('wallet,display_name,unpaid_points,token,amount\nA,"quiet, ""whale""",40,USDC,2\n');
  });
  it("escapes only when needed", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("a,b")).toBe('"a,b"');
  });
});

describe("rate limiting decision", () => {
  it("blocks at the configured maximum", () => {
    expect(isRateLimited(LIMITS.post.max - 1, "post")).toBe(false);
    expect(isRateLimited(LIMITS.post.max, "post")).toBe(true);
    expect(isRateLimited(0, "back")).toBe(false);
    expect(isRateLimited(LIMITS.back.max + 5, "back")).toBe(true);
  });
});
