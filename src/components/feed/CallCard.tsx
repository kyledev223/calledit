"use client";

import { useState } from "react";
import Link from "next/link";
import type { CallCardData } from "@/lib/queries";
import { useSession } from "@/components/wallet/SessionProvider";
import { Identity } from "@/components/ui/Identity";
import { StatusChip } from "@/components/ui/StatusChip";
import { Countdown } from "@/components/ui/Countdown";
import { displayNameOf, formatDate, formatDateShort, formatPct, formatRelative, formatUsd } from "@/lib/format";
import { distanceToLevelPct } from "@/lib/resolution";
import { SOURCE_LABEL, CATEGORY_LABEL } from "@/lib/assets";

export function CallCard({
  call: initial,
  onDeleted,
  compact = false,
}: {
  call: CallCardData;
  onDeleted?: (id: string) => void;
  compact?: boolean;
}) {
  const { user } = useSession();
  const [call, setCall] = useState(initial);
  const [busy, setBusy] = useState<"up" | "back" | "del" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isAuthor = user?.id === call.author.id;
  const live = call.status === "LIVE";
  const price = call.currentPrice;
  const dist = price != null ? distanceToLevelPct(call.direction, call.level, price) : null;

  async function act(kind: "up" | "back") {
    if (!user) {
      setMsg("Connect your wallet to back calls.");
      return;
    }
    setBusy(kind);
    setMsg(null);
    try {
      const res = await fetch(`/api/calls/${call.id}/${kind === "up" ? "upvote" : "back"}`, { method: "POST" });
      const data = (await res.json()) as { error?: string; upvoted?: boolean; backed?: boolean; count: number };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setCall((c) => {
        if (kind === "up") return { ...c, viewerUpvoted: !!data.upvoted, upvoteCount: data.count };
        const me = { id: user.id, wallet: user.wallet, displayName: user.displayName };
        const backers = data.backed ? [...c.backers.filter((b) => b.id !== user.id), me] : c.backers.filter((b) => b.id !== user.id);
        return { ...c, viewerBacked: !!data.backed, buyThroughCount: data.count, backers };
      });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function del() {
    if (!confirm(call.status === "PLAYED_OUT" ? "Delete this call? Points it awarded will be reversed for everyone." : "Delete this call?")) return;
    setBusy("del");
    try {
      const res = await fetch(`/api/calls/${call.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onDeleted?.(call.id);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={`card card-hover p-4 sm:p-5 flex flex-col gap-4 ${call.status === "MISSED" ? "opacity-[0.86]" : ""}`}>
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Identity user={call.author} />
            {call.backers.length > 0 && (
              <span className="text-xs text-fg2">
                with{" "}
                {call.backers.slice(0, 3).map((b, i) => (
                  <span key={b.id}>
                    {i > 0 && ", "}
                    <Link href={`/u/${b.wallet}`} className="font-semibold text-fg hover:underline">
                      {displayNameOf(b)}
                    </Link>
                  </span>
                ))}
                {call.backers.length > 3 && ` +${call.backers.length - 3}`}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-mute">
            posted {formatRelative(call.createdAt)} · {CATEGORY_LABEL[call.asset.category]}
          </p>
        </div>
        <StatusChip status={call.status} />
      </div>

      {/* the call */}
      <Link href={`/call/${call.id}`} className="block group">
        <p className="font-display text-xl sm:text-2xl leading-snug">
          <span className="font-mono text-lg sm:text-xl font-semibold tracking-tight">{call.asset.symbol}</span>{" "}
          ends <em className="text-pink">{call.direction === "ABOVE" ? "above" : "below"}</em>{" "}
          <span className="font-mono font-semibold">{formatUsd(call.level, call.asset.decimals)}</span>
          <span className="text-fg2"> by </span>
          <span className="text-fg2 text-base sm:text-lg whitespace-nowrap" title={formatDate(call.expiresAt)}>{formatDateShort(call.expiresAt)}</span>
        </p>
      </Link>

      {/* numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label={live ? "Expires in" : "Expiry"}>
          {live ? <Countdown to={call.expiresAt} /> : <span className="font-mono">{formatRelative(call.expiresAt)}</span>}
        </Stat>
        {live ? (
          <>
            <Stat label="Now">
              <span className="font-mono">{price != null ? formatUsd(price, call.asset.decimals) : "—"}</span>
            </Stat>
            <Stat label="To level">
              <span className={`font-mono ${dist != null && dist <= 0 ? "text-pink" : ""}`}>
                {dist != null ? (dist <= 0 ? "through" : formatPct(dist)) : "—"}
              </span>
            </Stat>
          </>
        ) : (
          <>
            <Stat label={call.status === "PLAYED_OUT" ? "Traded at" : "Last seen"}>
              <span className="font-mono">{formatUsd(call.resolvedPrice, call.asset.decimals)}</span>
            </Stat>
            <Stat label="Proof" wrap>
              <span className="text-xs text-fg2 leading-snug block">
                {call.resolvedSource ? SOURCE_LABEL[call.resolvedSource] : "—"}
                {call.resolvedPriceAt && <> · {formatDateShort(call.resolvedPriceAt)}</>}
              </span>
            </Stat>
          </>
        )}
        <Stat label="At post">
          <span className="font-mono text-fg2">{formatUsd(call.priceAtPost, call.asset.decimals)}</span>
        </Stat>
      </div>

      {/* actions */}
      {!compact && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            type="button"
            disabled={!live || isAuthor || busy !== null}
            onClick={() => void act("up")}
            className={`chip transition ${call.viewerUpvoted ? "bg-pink text-on-pink border-pink" : "hover:border-line2"} disabled:opacity-60`}
            title={isAuthor ? "You can't upvote your own call" : "Upvote"}
          >
            <span aria-hidden>▲</span> {call.upvoteCount}
          </button>
          <button
            type="button"
            disabled={!live || isAuthor || busy !== null}
            onClick={() => void act("back")}
            className={`chip transition ${call.viewerBacked ? "bg-pink text-on-pink border-pink" : "hover:border-line2"} disabled:opacity-60`}
            title={isAuthor ? "You can't back your own call" : "Buy-through: put your name on this call (points only)"}
          >
            {call.viewerBacked ? "Backing" : "Buy-through"} · {call.buyThroughCount}
          </button>
          {isAuthor && (
            <button type="button" onClick={() => void del()} disabled={busy !== null} className="ml-auto text-xs text-mute hover:text-fire">
              {busy === "del" ? "Deleting…" : "Delete"}
            </button>
          )}
          {msg && <p className="basis-full text-xs text-fire">{msg}</p>}
        </div>
      )}
    </article>
  );
}

function Stat({ label, children, wrap = false }: { label: string; children: React.ReactNode; wrap?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-mute">{label}</p>
      <div className={`mt-0.5 ${wrap ? "" : "truncate"}`}>{children}</div>
    </div>
  );
}
