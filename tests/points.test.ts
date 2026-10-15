import { describe, expect, it } from "vitest";
import { balanceOf, computeAwards, computeReversals, POINTS } from "@/lib/points";

describe("computeAwards", () => {
  it("awards the author 2 per upvote and 5 per buy-through, backers 3 each", () => {
    const rows = computeAwards({ callId: "c1", authorId: "A", upvoterIds: ["U1", "U2", "U3"], backerIds: ["B1", "B2"] });
    const author = rows.filter((r) => r.userId === "A");
    expect(balanceOf(author)).toBe(3 * POINTS.AUTHOR_PER_UPVOTE + 2 * POINTS.AUTHOR_PER_BUYTHROUGH); // 6 + 10 = 16
    expect(rows.filter((r) => r.reason === "AUTHOR_UPVOTE")).toHaveLength(3);
    expect(rows.filter((r) => r.reason === "AUTHOR_BUYTHROUGH")).toHaveLength(2);
    const b1 = rows.filter((r) => r.userId === "B1");
    expect(b1).toEqual([{ userId: "B1", callId: "c1", delta: 3, reason: "BACKER_BUYTHROUGH" }]);
    expect(balanceOf(rows.filter((r) => r.userId === "B2"))).toBe(3);
    expect(rows.every((r) => r.callId === "c1")).toBe(true);
  });

  it("awards nothing when nobody backed the call", () => {
    expect(computeAwards({ callId: "c", authorId: "A", upvoterIds: [], backerIds: [] })).toEqual([]);
  });

  it("ignores the author backing their own call (defence in depth)", () => {
    const rows = computeAwards({ callId: "c", authorId: "A", upvoterIds: ["A"], backerIds: ["A"] });
    expect(rows).toEqual([]);
  });
});

describe("computeReversals", () => {
  const awards = computeAwards({ callId: "c1", authorId: "A", upvoterIds: ["U1"], backerIds: ["B1"] });

  it("mirrors every award with a negative row so balances return to zero", () => {
    const reversals = computeReversals(awards);
    expect(reversals).toHaveLength(awards.length);
    expect(reversals.every((r) => r.reason === "REVERSAL" && r.delta < 0 && r.callId === "c1")).toBe(true);
    for (const user of ["A", "B1"]) {
      const all = [...awards, ...reversals].filter((r) => r.userId === user);
      expect(balanceOf(all)).toBe(0);
    }
  });

  it("does not reverse rows that are already reversals or voids", () => {
    const once = computeReversals(awards);
    const twice = computeReversals([...awards, ...once]);
    expect(twice).toHaveLength(awards.length); // only the original awards, not the reversals
    const voided = computeReversals([{ userId: "A", callId: "c1", delta: -4, reason: "VOID" }]);
    expect(voided).toEqual([]);
  });
});

describe("balanceOf", () => {
  it("sums deltas", () => {
    expect(balanceOf([{ delta: 5 }, { delta: -2 }, { delta: 3 }])).toBe(6);
    expect(balanceOf([])).toBe(0);
  });
});
