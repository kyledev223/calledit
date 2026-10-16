import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ContractAddress, SocialLinks } from "@/components/SocialLinks";
import { SITE_NAME } from "@/lib/site";

export const DISCLAIMER =
  "Points are a record of who was right. Payouts are discretionary and not guaranteed. Not financial advice.";

export function Footer() {
  return (
    <footer className="mt-auto">
      {/* Big dim echo of the headline */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-20 sm:pt-28 overflow-hidden" aria-hidden>
        <p className="echo text-[clamp(44px,9vw,124px)]">Put it on</p>
        <p className="echo text-[clamp(44px,9vw,124px)]">the tape.</p>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-9 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <Link href="/" aria-label={`${SITE_NAME} home`}>
              <Logo />
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SocialLinks variant="label" />
              <ContractAddress />
            </div>
            <p className="mt-3 text-sm text-fg2 leading-relaxed">{DISCLAIMER}</p>
            <p className="mt-2 text-xs text-mute leading-relaxed">
              {SITE_NAME} never holds funds and never asks your wallet to sign a transaction. Prices come from public market data
              feeds and may be delayed.
            </p>
          </div>
          <nav className="flex gap-x-8 gap-y-2 text-sm flex-wrap font-display">
            <div className="flex flex-col gap-2">
              <Link href="/feed" className="text-fg2 hover:text-pink">The tape</Link>
              <Link href="/board" className="text-fg2 hover:text-pink">Leaderboard</Link>
              <Link href="/how" className="text-fg2 hover:text-pink">How it works</Link>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/you" className="text-fg2 hover:text-pink">Your profile</Link>
              <Link href="/how#payouts" className="text-fg2 hover:text-pink">Payouts</Link>
              <Link href="/how#faq" className="text-fg2 hover:text-pink">FAQ</Link>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
