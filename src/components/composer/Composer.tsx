"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssetCategory } from "@prisma/client";
import { useSession } from "@/components/wallet/SessionProvider";
import { ConnectButton, Reassurance } from "@/components/wallet/ConnectButton";
import { Sparkline } from "@/components/ui/Sparkline";
import { Modal } from "@/components/ui/Modal";
import { formatUsd, formatPct } from "@/lib/format";
import { distanceToLevelPct, expiryIsValid, levelIsOnCorrectSide } from "@/lib/resolution";
import { CATEGORY_LABEL } from "@/lib/assets";

export interface ComposerAsset {
  symbol: string;
  name: string;
  category: AssetCategory;
  decimals: number;
}

interface QuoteResp {
  price: number;
  at: string;
  source: string;
  sparkline: number[] | null;
}

const EXPIRY_PRESETS = [
  { label: "1 hour", ms: 60 * 60_000 },
  { label: "24 hours", ms: 24 * 60 * 60_000 },
  { label: "3 days", ms: 3 * 24 * 60 * 60_000 },
  { label: "1 week", ms: 7 * 24 * 60 * 60_000 },
  { label: "1 month", ms: 30 * 24 * 60 * 60_000 },
  { label: "custom", ms: 0 },
];

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Composer({ assets }: { assets: ComposerAsset[] }) {
  const router = useRouter();
  const { user } = useSession();
  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? "BTC");
  const [direction, setDirection] = useState<"ABOVE" | "BELOW">("ABOVE");
  const [level, setLevel] = useState("");
  const [preset, setPreset] = useState(1);
  const [custom, setCustom] = useState(() => toLocalInput(new Date(Date.now() + 24 * 60 * 60_000)));
  const [quote, setQuote] = useState<QuoteResp | null>(null);
  const [quoteErr, setQuoteErr] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asset = useMemo(() => assets.find((a) => a.symbol === symbol) ?? assets[0], [assets, symbol]);

  useEffect(() => {
    let alive = true;
    setQuote(null);
    setQuoteErr(false);
    const load = async () => {
      try {
        const res = await fetch(`/api/prices?symbol=${symbol}&spark=1`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as QuoteResp;
        if (alive) setQuote(data);
      } catch {
        if (alive) setQuoteErr(true);
      }
    };
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol]);

  const expiresAt = useMemo(() => {
    const p = EXPIRY_PRESETS[preset];
    return p.ms ? new Date(Date.now() + p.ms) : new Date(custom);
  }, [preset, custom]);

  const levelNum = Number(level.replace(/,/g, ""));
  const sideOk = quote ? levelIsOnCorrectSide(direction, levelNum, quote.price) : true;
  const expiryCheck = expiryIsValid(expiresAt, new Date());
  const dist = quote && Number.isFinite(levelNum) && levelNum > 0 ? distanceToLevelPct(direction, levelNum, quote.price) : null;

  const problems: string[] = [];
  if (level && !Number.isFinite(levelNum)) problems.push("Level must be a number.");
  if (level && quote && Number.isFinite(levelNum) && !sideOk)
    problems.push(`For "${direction.toLowerCase()}", the level must be ${direction === "ABOVE" ? "higher" : "lower"} than the current price.`);
  if (!expiryCheck.ok) problems.push(expiryCheck.reason);
  const canSubmit = !!user && !!level && Number.isFinite(levelNum) && sideOk && expiryCheck.ok && !!quote && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asset: symbol, direction, level: levelNum, expiresAt: expiresAt.toISOString() }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not post");
      router.push("/feed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post");
    } finally {
      setSubmitting(false);
    }
  }

  // Suggest a round level near the price when the asset changes.
  useEffect(() => {
    if (!quote || level) return;
    const p = quote.price;
    const bump = direction === "ABOVE" ? 1.05 : 0.95;
    const raw = p * bump;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
    setLevel(String(Number((Math.round(raw / mag) * mag).toPrecision(6))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.price]);

  return (
    <div className="card p-5 sm:p-7 border-line2 shadow-[6px_6px_0_rgba(230, 0, 126, 0.10)]">
      <div className="flex items-center justify-between gap-3 mb-5 font-mono text-[11px] uppercase tracking-wider text-mute">
        <span className="flex items-center gap-2"><span className="size-1.5 bg-pink animate-pulse-dot" aria-hidden />new call</span>
        <span>free · no tx</span>
      </div>
      <p className="font-display text-[1.6rem] leading-[1.35] sm:text-[2rem] lg:text-[1.85rem] xl:text-[2.05rem] sm:leading-[1.3]">
        I want the receipts if{" "}
        <span className="slot">
          <button type="button" onClick={() => setPickerOpen(true)} className="font-mono font-semibold" aria-haspopup="dialog">
            {asset?.symbol ?? "…"}
          </button>
        </span>{" "}
        ends{" "}
        <span className="slot">
          <select value={direction} onChange={(e) => setDirection(e.target.value as "ABOVE" | "BELOW")} aria-label="Direction" className="font-display pr-4">
            <option value="ABOVE">above</option>
            <option value="BELOW">below</option>
          </select>
          <span aria-hidden className="-ml-3 text-pink text-sm">▾</span>
        </span>{" "}
        $
        <span className="slot">
          <input
            inputMode="decimal"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Price level"
            placeholder="level"
            className="font-mono font-semibold w-[7ch] sm:w-[9ch]"
            style={{ width: `${Math.max(5, level.length + 1)}ch` }}
          />
        </span>{" "}
        by{" "}
        <span className="slot">
          <select value={preset} onChange={(e) => setPreset(Number(e.target.value))} aria-label="Expiry" className="font-display pr-4">
            {EXPIRY_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>{p.label === "custom" ? "a date I pick" : `${p.label} from now`}</option>
            ))}
          </select>
          <span aria-hidden className="-ml-3 text-pink text-sm">▾</span>
        </span>
        .
      </p>

      {EXPIRY_PRESETS[preset].ms === 0 && (
        <div className="mt-4">
          <label className="text-xs text-fg2 block mb-1">Expiry (your local time)</label>
          <input type="datetime-local" className="input max-w-xs" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </div>
      )}

      {/* live price strip */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 border border-line2 bg-lcd bg-[repeating-linear-gradient(0deg,rgba(230, 0, 126, 0.03)_0_1px,transparent_1px_3px)] p-4">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-mute">
            {asset?.name} · {asset ? CATEGORY_LABEL[asset.category] : ""}
          </p>
          <p className="font-mono text-2xl mt-1 text-pink">
            {quote ? formatUsd(quote.price, asset?.decimals) : quoteErr ? <span className="text-sm text-fire">Price unavailable right now</span> : <span className="text-mute">…</span>}
          </p>
          <p className="text-xs text-fg2 mt-1">
            {quote && dist != null && Number.isFinite(dist) && sideOk && (
              <>
                Level is <span className="font-mono">{formatPct(Math.abs(dist))}</span> {direction === "ABOVE" ? "above" : "below"} the current price · expires{" "}
                {expiresAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </>
            )}
            {quote && !sideOk && level && <span className="text-fire">Level is on the wrong side of the price.</span>}
          </p>
        </div>
        <div className="shrink-0">
          {quote?.sparkline ? <Sparkline points={quote.sparkline} level={Number.isFinite(levelNum) && levelNum > 0 ? levelNum : null} width={180} height={48} /> : <div className="h-12 w-[180px] bg-card" />}
          <p className="font-mono text-[10px] text-mute text-right mt-1">{quote ? `48h · ${quote.source.toLowerCase()}` : ""}</p>
        </div>
      </div>

      {problems.length > 0 && level && (
        <ul className="mt-3 text-sm text-fire space-y-1">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {error && <p className="mt-3 text-sm text-fire">{error}</p>}

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        {user ? (
          <button type="button" className="btn btn-accent" disabled={!canSubmit} onClick={() => void submit()}>
            {submitting ? "Posting…" : "Put it on the tape"}
          </button>
        ) : (
          <ConnectButton />
        )}
        <div className="text-xs text-fg2">
          <p>Posting is free. No capital, no transaction, no token.</p>
          {!user && <Reassurance />}
        </div>
      </div>

      {pickerOpen && (
        <AssetPicker
          assets={assets}
          current={symbol}
          onPick={(s) => {
            setSymbol(s);
            setLevel("");
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function AssetPicker({ assets, current, onPick, onClose }: { assets: ComposerAsset[]; current: string; onPick: (s: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState<AssetCategory>(assets.find((a) => a.symbol === current)?.category ?? "CRYPTO");
  const [q, setQ] = useState("");
  const [prices, setPrices] = useState<Record<string, { price: number }>>({});
  const cats: AssetCategory[] = ["CRYPTO", "TRADFI", "MEMECOIN"];

  const list = assets.filter((a) => (q ? a.symbol.toLowerCase().includes(q.toLowerCase()) || a.name.toLowerCase().includes(q.toLowerCase()) : a.category === cat));

  useEffect(() => {
    const syms = list.map((a) => a.symbol).join(",");
    if (!syms) return;
    fetch(`/api/prices?symbols=${syms}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { quotes: Record<string, { price: number }> }) => setPrices((p) => ({ ...p, ...d.quotes })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, q]);

  return (
    <Modal title="Pick an asset" onClose={onClose}>
      <input className="input mb-3" placeholder="Search BTC, Nvidia, WIF…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      {!q && (
        <div className="flex gap-1 mb-3">
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className={`px-3 py-1.5 font-display text-[15px] font-medium transition ${cat === c ? "bg-pink text-on-pink" : "text-fg2 hover:bg-bg2"}`}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      )}
      <ul className="max-h-[50vh] overflow-y-auto -mx-2 px-2 space-y-1">
        {list.map((a) => (
          <li key={a.symbol}>
            <button type="button" onClick={() => onPick(a.symbol)} className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-bg2 transition ${a.symbol === current ? "bg-bg2" : ""}`}>
              <span className="font-mono font-semibold w-20 shrink-0">{a.symbol}</span>
              <span className="text-sm text-fg2 truncate">{a.name}</span>
              <span className="ml-auto font-mono text-sm tabular">{prices[a.symbol] ? formatUsd(prices[a.symbol].price, a.decimals) : ""}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-fg2 p-3">No match.</li>}
      </ul>
    </Modal>
  );
}
