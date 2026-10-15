"use client";

import { useState } from "react";
import type { AdminOverview } from "@/lib/admin";
import { tokenAmount } from "@/lib/admin-shared";
import { Eyebrow, Heading } from "@/components/ui/Section";
import { Identity } from "@/components/ui/Identity";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatDate, formatInt, solscanTx, truncateWallet } from "@/lib/format";

async function post<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function AdminDashboard({ initial, adminWallet }: { initial: AdminOverview; adminWallet: string }) {
  const [data, setData] = useState(initial);
  const [rate, setRate] = useState(String(initial.settings.rate));
  const [token, setToken] = useState(initial.settings.token);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/admin/data", { cache: "no-store" });
    if (res.ok) setData((await res.json()) as AdminOverview);
  }

  async function run(label: string, fn: () => Promise<unknown>) {
    setErr(null);
    setNotice(null);
    try {
      await fn();
      await refresh();
      setNotice(label);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  const unpaidTotal = data.balances.reduce((s, b) => s + Math.max(0, b.unpaid), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-12">
      <div>
        <Eyebrow className="mb-3">Admin</Eyebrow>
        <Heading lead="Payouts," accent="by hand." />
        <p className="mt-3 text-fg2 max-w-2xl">
          Signed in as <span className="font-mono">{truncateWallet(adminWallet)}</span>. The app never moves funds: send tokens from your own
          wallet, then record the signature here. Marking paid attaches every unpaid ledger row to the payout.
        </p>
        {(notice || err) && (
          <p className={`mt-3 text-sm ${err ? "text-fire" : "text-pink"}`}>{err ?? notice}</p>
        )}
      </div>

      {/* Settings */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-2xl">Conversion</h2>
        <div className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end max-w-xl">
          <label className="text-sm">
            <span className="block text-xs text-fg2 mb-1">Tokens per point</span>
            <input className="input font-mono" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-fg2 mb-1">Payout token</span>
            <input className="input font-mono uppercase" value={token} onChange={(e) => setToken(e.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void run("Settings saved.", () => post("/api/admin/settings", { rate: Number(rate), token }, "PUT"))}
          >
            Save
          </button>
        </div>
        <p className="mt-3 text-xs text-fg2">
          Current: 1 point = <span className="font-mono">{data.settings.rate} {data.settings.token}</span>. Unpaid across all wallets:{" "}
          <span className="font-mono">{formatInt(unpaidTotal)} pts ≈ {tokenAmount(unpaidTotal, data.settings.rate)} {data.settings.token}</span>
        </p>
      </section>

      {/* Balances */}
      <section>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-display text-2xl">Unpaid balances</h2>
          <a href="/api/admin/export" className="btn btn-ghost btn-sm">Export CSV</a>
        </div>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-mute border-b border-line">
                <th className="px-4 py-3">Wallet</th>
                <th className="px-4 py-3 text-right">Unpaid</th>
                <th className="px-4 py-3 text-right">≈ {data.settings.token}</th>
                <th className="px-4 py-3 text-right">Lifetime</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.balances.map((b) => (
                <BalanceRow key={b.userId} b={b} token={data.settings.token} rate={data.settings.rate} run={run} />
              ))}
              {data.balances.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-fg2">No ledger activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Payout history */}
      <section>
        <h2 className="font-display text-2xl">Payout history</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <tbody>
              {data.payouts.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5"><Identity user={{ wallet: p.wallet, displayName: p.displayName }} /></td>
                  <td className="px-4 py-2.5 font-mono text-right">{formatInt(p.points)} pts</td>
                  <td className="px-4 py-2.5 font-mono text-right">{p.amount} {p.token}</td>
                  <td className="px-4 py-2.5"><a className="font-mono text-xs text-pink hover:underline" href={solscanTx(p.txSignature)} target="_blank" rel="noreferrer">{truncateWallet(p.txSignature, 8, 8)} ↗</a></td>
                  <td className="px-4 py-2.5 text-xs text-mute">{formatDate(p.paidAt)} · by {truncateWallet(p.paidBy)}</td>
                </tr>
              ))}
              {data.payouts.length === 0 && <tr><td className="px-4 py-8 text-center text-fg2">No payouts recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Anti-abuse */}
      <section className="grid lg:grid-cols-2 gap-6">
        <LinkWallets links={data.links} run={run} />
        <FlagWallet flagged={data.flagged} run={run} />
      </section>
    </div>
  );
}

function BalanceRow({
  b,
  token,
  rate,
  run,
}: {
  b: AdminOverview["balances"][number];
  token: string;
  rate: number;
  run: (label: string, fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [sig, setSig] = useState("");
  const [voidPts, setVoidPts] = useState("");
  return (
    <tr className="border-b border-line last:border-0 align-top">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Identity user={b} />
          <CopyButton text={b.wallet} />
          {b.isFlagged && <span className="chip status-missed">flagged</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono font-semibold">{formatInt(b.unpaid)}</td>
      <td className="px-4 py-3 text-right font-mono">{tokenAmount(Math.max(0, b.unpaid), rate)}</td>
      <td className="px-4 py-3 text-right font-mono text-fg2">{formatInt(b.lifetime)}</td>
      <td className="px-4 py-3 text-right font-mono text-fg2">{formatInt(b.paidPoints)}</td>
      <td className="px-4 py-3">
        {b.unpaid > 0 ? (
          <div className="flex flex-col gap-2 min-w-[260px]">
            <div className="flex gap-2">
              <input className="input font-mono text-xs py-1.5" placeholder="Paste tx signature" value={sig} onChange={(e) => setSig(e.target.value)} />
              <button
                type="button"
                className="btn btn-accent btn-sm"
                disabled={sig.trim().length < 40}
                onClick={() => void run(`Marked ${b.unpaid} pts paid for ${truncateWallet(b.wallet)}.`, () => post("/api/admin/payouts", { wallet: b.wallet, txSignature: sig.trim() })).then(() => setSig(""))}
              >
                Mark paid · {tokenAmount(b.unpaid, rate)} {token}
              </button>
            </div>
            <div className="flex gap-2">
              <input className="input font-mono text-xs py-1.5" placeholder={`Void (max ${b.unpaid})`} inputMode="numeric" value={voidPts} onChange={(e) => setVoidPts(e.target.value)} />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const n = voidPts ? Number(voidPts) : undefined;
                  if (!confirm(`Void ${n ?? b.unpaid} unpaid points from ${truncateWallet(b.wallet)}?`)) return;
                  void run("Points voided.", () => post("/api/admin/void", { wallet: b.wallet, points: n })).then(() => setVoidPts(""));
                }}
              >
                Void
              </button>
            </div>
          </div>
        ) : (
          <span className="text-xs text-mute">—</span>
        )}
      </td>
    </tr>
  );
}

function LinkWallets({ links, run }: { links: AdminOverview["links"]; run: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [note, setNote] = useState("");
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-2xl">Linked wallets</h2>
      <p className="mt-1 text-sm text-fg2">Linked wallets cannot back each other&apos;s calls.</p>
      <div className="mt-4 grid gap-2">
        <input className="input font-mono text-xs" placeholder="Wallet A" value={a} onChange={(e) => setA(e.target.value)} />
        <input className="input font-mono text-xs" placeholder="Wallet B" value={b} onChange={(e) => setB(e.target.value)} />
        <input className="input text-sm" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="button"
          className="btn btn-primary btn-sm justify-self-start"
          disabled={!a || !b}
          onClick={() => void run("Wallets linked.", () => post("/api/admin/links", { walletA: a.trim(), walletB: b.trim(), note: note || undefined })).then(() => { setA(""); setB(""); setNote(""); })}
        >
          Link
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line text-sm">
        {links.map((l) => (
          <li key={l.id} className="py-2 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs">{truncateWallet(l.a.wallet)}</span>
            <span className="text-mute">↔</span>
            <span className="font-mono text-xs">{truncateWallet(l.b.wallet)}</span>
            {l.note && <span className="text-xs text-fg2">· {l.note}</span>}
            <button type="button" className="ml-auto text-xs text-mute hover:text-fire" onClick={() => void run("Link removed.", () => fetch(`/api/admin/links?id=${l.id}`, { method: "DELETE" }))}>
              remove
            </button>
          </li>
        ))}
        {links.length === 0 && <li className="py-2 text-xs text-mute">None.</li>}
      </ul>
    </section>
  );
}

function FlagWallet({ flagged, run }: { flagged: AdminOverview["flagged"]; run: (label: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [w, setW] = useState("");
  const [note, setNote] = useState("");
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-display text-2xl">Restricted wallets</h2>
      <p className="mt-1 text-sm text-fg2">Restricted wallets cannot post or back calls. Existing points stay until voided.</p>
      <div className="mt-4 grid gap-2">
        <input className="input font-mono text-xs" placeholder="Wallet" value={w} onChange={(e) => setW(e.target.value)} />
        <input className="input text-sm" placeholder="Reason (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="button"
          className="btn btn-primary btn-sm justify-self-start"
          disabled={!w}
          onClick={() => void run("Wallet restricted.", () => post("/api/admin/flag", { wallet: w.trim(), flagged: true, note: note || undefined })).then(() => { setW(""); setNote(""); })}
        >
          Restrict
        </button>
      </div>
      <ul className="mt-4 divide-y divide-line text-sm">
        {flagged.map((f) => (
          <li key={f.wallet} className="py-2 flex items-center gap-2 flex-wrap">
            <Identity user={f} />
            {f.flagNote && <span className="text-xs text-fg2">· {f.flagNote}</span>}
            <button type="button" className="ml-auto text-xs text-mute hover:text-pink" onClick={() => void run("Restriction lifted.", () => post("/api/admin/flag", { wallet: f.wallet, flagged: false }))}>
              restore
            </button>
          </li>
        ))}
        {flagged.length === 0 && <li className="py-2 text-xs text-mute">None.</li>}
      </ul>
    </section>
  );
}
