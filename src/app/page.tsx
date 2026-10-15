import Link from "next/link";
import { Composer } from "@/components/composer/Composer";
import { CallCard } from "@/components/feed/CallCard";
import { Heading, Section } from "@/components/ui/Section";
import { TickNumber } from "@/components/ui/TickNumber";
import { getActiveAssets, getRecentCalls, getSiteStats } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { FAQ } from "@/components/home/FAQ";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const me = await getCurrentUser();
  const [assets, stats, recent] = await Promise.all([getActiveAssets(), getSiteStats(), getRecentCalls(4, me?.id)]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(50%_60%_at_75%_30%,rgba(230, 0, 126, 0.07),transparent_70%)] pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12">
          <div>
            <p className="tag">a public tape for market calls</p>
            <Heading as="h1" size="xl" lead="Put it" accent="on the tape." className="mt-6 [&_em]:block" />
            <p className="mt-6 text-[clamp(17px,1.6vw,20px)] text-fg2 leading-relaxed max-w-[46ch]">
              Name an asset, a level and a date.{" "}
              <strong className="text-fg font-semibold">If price gets there in time, the record shows it and points follow.</strong>{" "}
              If not, that shows too. Free to post, free to back, nothing to approve.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="kv">post = <b>free</b></span>
              <span className="kv">back = <b>points</b></span>
              <span className="kv">sign in = <b>message only</b></span>
            </div>
          </div>
          <div className="min-w-0">
            <Composer assets={assets.map((a) => ({ symbol: a.symbol, name: a.name, category: a.category, decimals: a.decimals }))} />
          </div>
        </div>
      </section>

      {/* Live panel */}
      <section id="live" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <p className="eyebrow mb-4">Right now</p>
          <Heading lead="The tape," accent="live." />
          <p className="mt-4 text-fg2 leading-relaxed max-w-xl">
            Every call resolves against public market data, one minute at a time. Points are only ever paid for calls that
            actually played out.
          </p>
          <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="calls live" value={stats.callsLive} note="checked every minute" />
            <Stat label="played out" value={stats.callsPlayedOut} note="with price proof" />
            <Stat label="points paid" value={stats.pointsPaid} note="sent by hand" />
            <Stat label="wallets paid" value={stats.walletsPaid} note="tx on Solscan" />
          </dl>
        </div>
      </section>

      {/* Recent */}
      <Section
        id="recent"
        eyebrow="Fresh ink"
        lead="The latest"
        accent="calls."
        copy={
          <>
            Newest first. Back the ones you believe in, or go put your own up.{" "}
            <Link href="/feed" className="text-pink underline underline-offset-4 decoration-line2 hover:decoration-pink">
              See the whole tape →
            </Link>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {recent.map((c) => <CallCard key={c.id} call={c} />)}
          {recent.length === 0 && <p className="text-fg2">No calls yet. Yours could be first.</p>}
        </div>
      </Section>

      {/* How it works */}
      <Section
        id="how"
        eyebrow="How it works"
        lead="Four steps,"
        accent="no capital."
        copy="You never deposit, stake or sign a transaction. A call is a claim with a timestamp, and the market grades it."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Post", "free", "Pick an asset, say above or below a level, and set a deadline. The current price is stamped on it."],
            ["02", "Back", "points", "Upvote what you agree with, or buy-through to put your name next to the author's. Points only."],
            ["03", "Resolve", "proof", "Every minute we check live prices. Touch the level before expiry and it plays out. Otherwise, missed."],
            ["04", "Collect", "receipts", "Authors earn 2 per upvote and 5 per buy-through; backers earn 3. Points accrue to your wallet."],
          ].map(([n, title, key, body]) => (
            <div key={n} className="card card-hover p-6">
              <p className="font-mono text-xs text-mute">{n}</p>
              <h3 className="headline text-2xl mt-4">
                {title} <span className="font-mono normal-case text-xs font-normal text-pink align-middle">= {key}</span>
              </h3>
              <p className="mt-3 text-[15px] text-fg2 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Payouts */}
      <Section
        id="payouts"
        eyebrow="Payouts"
        lead="Points become"
        accent="tokens, by hand."
        copy="Periodically, an admin converts unpaid points at a posted rate and sends tokens from their own wallet to yours. The transaction signature is recorded on your profile. The app itself never holds or sends funds."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Auditable", "Every award, reversal and void is a ledger row. Your balance is a sum, not a stored number."],
            ["Discretionary", "Payouts are not guaranteed, and the rate can change. Points are first and foremost a record."],
            ["Your wallet", "The wallet you sign in with is the payout destination. There is nothing else to set up."],
          ].map(([t, b]) => (
            <div key={t} className="border border-dashed border-line2 p-5">
              <h3 className="headline text-lg text-pink">{t}</h3>
              <p className="mt-2 text-[15px] text-fg2 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" eyebrow="Questions" lead="Things people" accent="ask.">
        <FAQ />
      </Section>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-mute">{label}</dt>
      <dd className="mt-2 text-4xl sm:text-5xl text-pink">
        <TickNumber value={value} className="font-display font-bold" />
      </dd>
      <p className="mt-1 font-mono text-[11px] text-mute">{note}</p>
    </div>
  );
}
