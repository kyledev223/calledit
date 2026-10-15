import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, Heading, Section } from "@/components/ui/Section";
import { FAQ } from "@/components/home/FAQ";
import { POINTS } from "@/lib/points";
import { LIMITS } from "@/lib/ratelimit";

export const metadata: Metadata = { title: "How it works" };

export default function HowPage() {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-6">
        <Eyebrow className="mb-4">How it works</Eyebrow>
        <Heading as="h1" size="xl" lead="A claim," accent="then a record." />
        <p className="mt-6 text-lg text-fg2 max-w-2xl leading-relaxed">
          Called It is a public tape. You write down what you think will happen, the market grades it, and the result stays
          attached to your wallet. Here is exactly how each part works.
        </p>
      </div>

      <Section
        id="posting"
        eyebrow="01 · Posting"
        lead="Say it"
        accent="plainly."
        copy={
          <>
            <p>
              A call has four parts: an asset, a direction (above or below), a price level and an expiry. The composer reads
              like a sentence so there is nothing to misread later. The current price is stamped on the call when you post
              it.
            </p>
            <ul className="mt-4 space-y-2 text-base">
              <li>• The level must sit on the far side of the current price, otherwise it would already be true.</li>
              <li>• Expiry must be at least 10 minutes out and at most a year.</li>
              <li>• Posting needs no capital, no token and no transaction. Only a signed-in wallet.</li>
              <li>• Limit: {LIMITS.post.label}.</li>
            </ul>
          </>
        }
      />

      <Section
        id="backing"
        tone="deep"
        eyebrow="02 · Backing"
        lead="Put your name"
        accent="next to theirs."
        copy={
          <>
            <p>
              Two ways to back a call. An <strong className="text-fg">upvote</strong> is a quiet nod. A{" "}
              <strong className="text-fg">buy-through</strong> is louder: your name appears on the card beside the author&apos;s,
              and you share in the points if it plays out. Both are points-only actions; nothing is bought and no money moves.
            </p>
            <ul className="mt-4 space-y-2 text-base">
              <li>• One upvote and one buy-through per wallet per call. You can take either back while the call is live.</li>
              <li>• You cannot back your own call, or calls from a wallet an admin has linked to yours.</li>
              <li>• Limits: {LIMITS.back.label}, {LIMITS.upvote.label}.</li>
            </ul>
          </>
        }
      />

      <Section
        id="resolution"
        eyebrow="03 · Resolution"
        lead="The market"
        accent="grades it."
        copy={
          <>
            <p>
              A job runs every minute and checks each live call against its price feed. If the price touches or trades
              through the level at or before expiry, the call is marked <em className="text-pink not-italic font-semibold">played out</em>. If
              expiry passes first, it is marked <em className="text-mute not-italic font-semibold">missed</em> and nobody earns anything.
            </p>
            <p className="mt-4">
              The price, the source and the timestamp that triggered the decision are saved on the call and shown on the
              card as proof. Where the feed allows, we also check the high and low between checks so a brief wick still
              counts.
            </p>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Crypto", "Binance spot, USDT pairs. CoinGecko as fallback."],
            ["TradFi", "Yahoo Finance. Stocks, ETFs, gold and oil futures."],
            ["Memecoins", "CoinGecko. Price is the aggregated USD quote."],
          ].map(([t, b]) => (
            <div key={t} className="card p-5">
              <p className="font-mono text-sm font-semibold">{t}</p>
              <p className="mt-2 text-sm text-fg2">{b}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="points"
        tone="deep"
        eyebrow="04 · Points"
        lead="Who gets"
        accent="what."
        copy="Points are awarded only when a call plays out. A missed call awards zero to everyone. Every award is a row in a ledger, so your balance is always the sum of its history."
      >
        <div className="card overflow-hidden max-w-2xl">
          <table className="w-full text-sm">
            <tbody>
              <Row k="Author, per upvote" v={`+${POINTS.AUTHOR_PER_UPVOTE}`} />
              <Row k="Author, per buy-through" v={`+${POINTS.AUTHOR_PER_BUYTHROUGH}`} />
              <Row k="Each buy-through backer" v={`+${POINTS.BACKER_PER_BUYTHROUGH}`} />
              <Row k="Missed call" v="0 for everyone" />
              <Row k="Author deletes a played-out call" v="All awards reversed" />
              <Row k="Admin void (before payout)" v="Negative row, auditable" />
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="payouts"
        eyebrow="05 · Payouts"
        lead="Manual,"
        accent="on purpose."
        copy={
          <>
            <p>
              Called It never holds or sends funds. Periodically an admin sets a points-to-token rate and the payout token,
              exports unpaid balances, sends the tokens from their own wallet and pastes each transaction signature back in.
              Your profile then shows the amount paid with a link to the transaction on Solscan.
            </p>
            <p className="mt-4">
              Payouts are discretionary and not guaranteed. Think of points first as a record of who was right, and of
              payouts as a thank-you that may follow.
            </p>
          </>
        }
      />

      <Section id="faq" tone="deep" eyebrow="FAQ" lead="Still" accent="curious?">
        <FAQ />
        <p className="mt-8 text-fg2">
          Ready?{" "}
          <Link href="/" className="text-fg underline underline-offset-4 decoration-line2 hover:decoration-fg">
            Put something on the tape →
          </Link>
        </p>
      </Section>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">{k}</td>
      <td className="px-4 py-3 text-right font-mono">{v}</td>
    </tr>
  );
}
