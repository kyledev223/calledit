import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, Heading } from "@/components/ui/Section";
import { Identity } from "@/components/ui/Identity";
import { getLeaderboard, type Period } from "@/lib/queries";
import { formatInt } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard" };

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: p } = await searchParams;
  const period = (PERIODS.some((x) => x.key === p) ? p : "all") as Period;
  const rows = await getLeaderboard(period);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <Eyebrow className="mb-3">Leaderboard</Eyebrow>
      <Heading lead="Who's been" accent="right." />
      <p className="mt-3 text-fg2 max-w-xl">Ranked by points earned in the window. Win rate counts only calls that have resolved.</p>

      <div className="mt-8 flex gap-1">
        {PERIODS.map((x) => (
          <Link
            key={x.key}
            href={x.key === "all" ? "/board" : `/board?period=${x.key}`}
            className={`px-3.5 py-1.5 font-display text-[15px] font-medium transition ${period === x.key ? "bg-pink text-on-pink" : "text-fg2 hover:text-fg hover:bg-bg2"}`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-mute border-b border-line">
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3 text-right">Points</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Win rate</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Posted</th>
              <th className="px-4 py-3 text-right">Played out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user.id} className="border-b border-line last:border-0 hover:bg-bg2/60 transition">
                <td className="px-4 py-3 font-mono text-fg2">{r.rank}</td>
                <td className="px-4 py-3"><Identity user={r.user} showWallet /></td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatInt(r.points)}</td>
                <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">{r.winRate == null ? "—" : `${Math.round(r.winRate * 100)}%`}</td>
                <td className="px-4 py-3 text-right font-mono hidden sm:table-cell">{r.callsPosted}</td>
                <td className="px-4 py-3 text-right font-mono text-pink">{r.playedOut}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-fg2">Nothing has resolved in this window yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
