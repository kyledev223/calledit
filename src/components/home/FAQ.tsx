export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Does connecting my wallet cost anything or put my funds at risk?",
    a: "No. Signing in means signing one plain-text message that says, in so many words, that it does not authorize any transaction. Receipts never requests a transaction, token approval or delegation, and the code is tested to make sure it cannot.",
  },
  {
    q: "What counts as \"played out\"?",
    a: "A call plays out if the price touches or trades through your level at any point before the expiry you set. We check every minute and also look at the high/low between checks where the feed allows it. If expiry passes first, the call is missed.",
  },
  {
    q: "Where do prices come from?",
    a: "Crypto uses Binance spot (USDT pairs) with CoinGecko as a fallback, memecoins use CoinGecko, and stocks, ETFs and commodities use Yahoo Finance. The exact price, source and timestamp that resolved a call are stored and shown on the card.",
  },
  {
    q: "What is a buy-through?",
    a: "It is an endorsement with your name on it. Your name appears next to the author's on the call, and if it plays out you earn 3 points while the author earns 5. No money changes hands and nothing is bought.",
  },
  {
    q: "Can I delete a call?",
    a: "Yes, at any time. If the call had already played out, every point it awarded, to you and to anyone who backed it, is reversed in the ledger.",
  },
  {
    q: "How and when do I get paid?",
    a: "Payouts are manual. An admin sets a points-to-token rate, exports unpaid balances, sends tokens from their own wallet and records the transaction signature. Your profile then shows what was paid and links to the transaction on Solscan. Payouts are discretionary and not guaranteed.",
  },
  {
    q: "What stops someone from gaming it?",
    a: "You cannot back your own call, each wallet gets one upvote and one buy-through per call, posting and backing are rate-limited, admins can link wallets that belong to the same person so they cannot back each other, and points can be voided before payout.",
  },
];

export function FAQ() {
  return (
    <div className="grid gap-3 md:grid-cols-2 md:items-start">
      {FAQ_ITEMS.map((item) => (
        <details key={item.q} className="faq">
          <summary className="flex items-center justify-between gap-4 px-[18px] py-4">
            <span className="font-display font-semibold text-[17px] leading-snug">{item.q}</span>
            <span className="faq-icon shrink-0 text-pink text-sm leading-none" aria-hidden>▶</span>
          </summary>
          <p className="px-[18px] pb-4 text-[15px] text-fg2 leading-relaxed">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
