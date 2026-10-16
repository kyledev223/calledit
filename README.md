# Called

> Put it on the tape.

A public tape for crypto, TradFi and memecoin calls. Anyone with a Solana wallet can post
"I want the receipts if **BTC** ends **above** **$125,000** by **Oct 22**". A cron job grades
every live call against public price feeds. Calls that play out earn points for the author
and for the people who backed them. Points live in an auditable ledger and are paid out
manually, in crypto, by an admin.

**The app never holds funds and never asks a wallet to sign a transaction.** Sign-in is one
plain-text `signMessage`. This is enforced by a test (`tests/no-transaction.test.ts`).

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| Database | Postgres via Prisma 6 (Supabase, Neon or local) |
| Auth | Sign-In With Solana via `@solana/wallet-adapter` (Phantom, Solflare; Backpack and others via Wallet Standard). Signature verified server-side with `tweetnacl`, httpOnly session cookie. EVM (wagmi + RainbowKit + SIWE) can be added behind the same `ChainAuthProvider` interface. |
| Prices | Binance (crypto, USDT pairs) with CoinGecko fallback; CoinGecko (memecoins); Yahoo Finance (TradFi) |
| Resolution | `/api/cron/resolve`, scheduled every minute by Vercel Cron (`vercel.json`) |
| Tests | Vitest |

---

## Project layout

```
prisma/
  schema.prisma          data model (see below)
  migrations/            SQL migrations (0001_init)
  seed.ts                sample users, assets, calls in every state, a payout
src/
  app/
    page.tsx             home: hero + composer, live stats, how it works, FAQ
    feed/                the tape (All / Following / Live / Played out / Missed)
    board/               leaderboard (week / month / all time)
    you/  u/[wallet]/    profiles, follow, ledger, payouts
    call/[id]/           single call with resolution proof
    how/                 how it works
    admin/               admin dashboard (allowlisted wallets only)
    api/
      auth/              nonce, verify, logout, me
      calls/             post, delete, upvote, back
      feed/ prices/ assets/ stats/ follow/
      cron/resolve/      the resolver
      admin/             settings, payouts, void, links, flag, export
  lib/
    auth/
      types.ts           ChainAuthProvider interface + the no-spend statement
      providers/solana.ts  SIWS message build/parse + ed25519 verify
      providers/evm.ts   stub for SIWE
      session.ts         sessions, cookies, requireUser / requireAdmin
      client.ts          browser sign-in flow (signMessage only)
    prices/              binance.ts, coingecko.ts, yahoo.ts, index.ts (routing + cache)
    resolution.ts        pure resolution rules (tested)
    resolver.ts          cron job: checks live calls, stores proof, awards points
    points.ts            point rules, awards, reversals (pure + DB)
    calls.ts             post / upvote / buy-through / delete
    queries.ts           feed, leaderboard, profile, stats
    admin.ts             balances, payouts, void, settings, CSV
    ratelimit.ts         per-wallet action budgets (DB-backed)
    assets.ts            the asset catalog seeded into the DB
  components/            UI (wallet, composer, feed, profile, admin, ui primitives)
tests/                   signature, no-transaction rule, resolution, points, admin helpers
```

---

## Data model

- **User**: `wallet` is the account id and payout destination. `chain` enum (SOLANA now, EVM reserved). `displayName` optional. `isFlagged` restricts posting/backing.
- **AuthNonce**, **Session**: sign-in nonces (single use, 10 min) and hashed session tokens (30 days).
- **Asset**: symbol, name, category (CRYPTO / TRADFI / MEMECOIN), price `source` + `sourceId`, optional `coingeckoId` fallback.
- **Call**: author, asset, direction (ABOVE / BELOW), level, expiry, `priceAtPost`, status (LIVE / PLAYED_OUT / MISSED / DELETED) and **resolution proof**: `resolvedPrice`, `resolvedSource`, `resolvedPriceAt`, `resolvedAt`.
- **Upvote**, **BuyThrough**: unique per (call, user). **Follow**: unique per pair.
- **LedgerEntry**: every award, reversal and void is a row (`delta`, `reason`, `callId`, `payoutId`). Balances are sums. Unpaid = rows with `payoutId IS NULL`.
- **Payout**: points settled, token amount, rate used, `txSignature`, who marked it.
- **Setting**: `payout.rate`, `payout.token`.
- **WalletLink**: admin-flagged pairs that may not back each other. **ActionLog**: rate limiting.

### Points

| Event | Who | Points |
| --- | --- | --- |
| Call plays out | Author, per upvote | +2 |
| Call plays out | Author, per buy-through | +5 |
| Call plays out | Each buy-through backer | +3 |
| Call missed | Everyone | 0 |
| Author deletes a played-out call | Everyone who was awarded | mirrored negative `REVERSAL` rows |
| Admin void | Wallet | negative `VOID` row |

### Resolution rules

A call **plays out** if the price touches or trades through the level at any observation
whose timestamp is at or before expiry. Where the feed supports it (Binance 1m klines, Yahoo
1m bars) the resolver also checks the high/low since the last check, so a wick between cron
ticks still counts. If expiry passes first, the call is **missed**. The price, source and
timestamp that decided it are stored on the call and shown on the card.

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (pooled is fine) |
| `DIRECT_URL` | yes* | Direct (non-pooled) URL for migrations. Set it equal to `DATABASE_URL` if you don't use a pooler. |
| `NEXT_PUBLIC_APP_DOMAIN` | yes | Host users see in the browser, e.g. `receipts.example.com` or `localhost:3000`. Embedded in the sign-in message and checked on verify. |
| `NEXT_PUBLIC_APP_URL` | yes | Full origin, e.g. `https://receipts.example.com` |
| `SESSION_SECRET` | yes | Long random string used to hash session tokens |
| `ADMIN_WALLETS` | yes | Comma-separated Solana addresses allowed into `/admin` |
| `CRON_SECRET` | yes | Bearer token the scheduler sends to `/api/cron/resolve` |
| `COINGECKO_API_KEY` | no | CoinGecko demo/pro key for higher rate limits |
| `COINGECKO_PRO` | no | `1` to use `pro-api.coingecko.com` |
| `NEXT_PUBLIC_X_URL` | no | X profile URL for the X button. Can also be hard-coded in `src/lib/site.ts`. |
| `NEXT_PUBLIC_PUMP_CA` | no | pump.fun contract address. The pump.fun button links to `https://pump.fun/coin/<CA>` and the footer shows the CA with a copy button. |

Binance and Yahoo Finance need no keys. Binance's main API is geo-blocked in some regions
(HTTP 451); the client tries `data-api.binance.vision` next and then falls back to CoinGecko.

---

## Local setup

```bash
npm install
cp .env.example .env         # fill in DATABASE_URL etc.
npm run db:migrate           # applies prisma/migrations, creates the schema
npm run db:seed              # sample users, assets, calls in every state
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm test                     # vitest
npm run typecheck            # tsc --noEmit
npm run build                # prisma generate + next build
npm run db:studio            # browse the DB
```

### Running the resolver locally

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/resolve
```

It returns a summary (`checked`, `playedOut`, `missed`, `errors`, per-call details).

### Becoming an admin

Add your wallet address to `ADMIN_WALLETS`, restart the dev server, connect and sign in. The
user menu will show "Admin".

### A local Postgres in one line

```bash
docker run --name receipts-pg -e POSTGRES_PASSWORD=receipts -e POSTGRES_DB=receipts -p 5432:5432 -d postgres:16
# DATABASE_URL="postgresql://postgres:receipts@localhost:5432/receipts"
```

---

## Deploying to Vercel

1. Create a Postgres database (Supabase or Neon). Copy the pooled URL into `DATABASE_URL`
   and the direct URL into `DIRECT_URL`.
2. Push this repo to GitHub and import it in Vercel.
3. Set every variable from the table above in Vercel → Settings → Environment Variables.
   `NEXT_PUBLIC_APP_DOMAIN` must equal the domain users will visit (no scheme).
4. Run the migrations once against the production DB:
   ```bash
   DATABASE_URL=... DIRECT_URL=... npx prisma migrate deploy
   DATABASE_URL=... DIRECT_URL=... npm run db:seed    # optional
   ```
5. Deploy. `vercel.json` registers the cron (`* * * * *` → `/api/cron/resolve`). Vercel sends
   `Authorization: Bearer <CRON_SECRET>` automatically.

**Cron frequency note.** Per-minute crons require a Vercel Pro plan. On Hobby, either accept a
daily schedule (edit `vercel.json`) or point any external scheduler (GitHub Actions, cron-job.org,
a Supabase cron) at `GET /api/cron/resolve` with the bearer header. The endpoint is idempotent.

---

## Payout workflow (manual, by design)

1. `/admin` → **Conversion**: set tokens-per-point and the payout token (e.g. `0.05 USDC`).
2. **Unpaid balances** → **Export CSV** (wallet, display name, unpaid points, token, amount).
3. Send the tokens from your own wallet (any wallet or batch tool).
4. Paste each transaction signature into the row and click **Mark paid**. The payout row is
   created and every unpaid ledger row is attached to it in one transaction.
5. The recipient's profile shows `Paid: X TOKEN` with a Solscan link.

Anti-abuse tools on the same page: link two wallets (neither may back the other), restrict a
wallet from posting/backing, and void unpaid points.

---

## Security notes

- Sign-in message includes domain, address, nonce, issued-at, expiry and the sentence
  *"This signature does not authorize any transaction or spend any funds."* The server rejects
  messages whose domain, statement, nonce or timing don't match.
- Only `signMessage` is ever called on a wallet. `tests/no-transaction.test.ts` runs the
  sign-in flow against a spy wallet and scans `src/` for transaction APIs.
- Session tokens are random, stored hashed with `SESSION_SECRET`, httpOnly, SameSite=Lax.
- All `/api/admin/*` routes re-check the admin allowlist server-side.
- Rate limits: 10 posts, 30 buy-throughs, 120 upvotes per wallet per hour.

---

## Disclaimer

Points are a record of who was right. Payouts are discretionary and not guaranteed. Not financial advice.
