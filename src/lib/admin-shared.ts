/** Pure helpers safe to import from client components and tests (no Prisma). */

export interface PayoutSettings {
  rate: number; // tokens per point
  token: string;
}

export interface UnpaidRow {
  userId: string;
  wallet: string;
  displayName: string | null;
  isFlagged: boolean;
  unpaid: number;
  lifetime: number;
  paidPoints: number;
}

/** Token amount for a number of points at a rate, to 6 dp. */
export function tokenAmount(points: number, rate: number): number {
  return Math.round(points * rate * 1e6) / 1e6;
}

export function csvEscape(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of wallets with a positive unpaid balance. */
export function toCsv(rows: UnpaidRow[], settings: PayoutSettings): string {
  const header = ["wallet", "display_name", "unpaid_points", "token", "amount"].join(",");
  const lines = rows
    .filter((r) => r.unpaid > 0)
    .map((r) =>
      [r.wallet, csvEscape(r.displayName ?? ""), String(r.unpaid), settings.token, String(tokenAmount(r.unpaid, settings.rate))].join(","),
    );
  return [header, ...lines].join("\n") + "\n";
}
