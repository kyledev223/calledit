"use client";

import { useState } from "react";
import type { CallCardData, ProfileData } from "@/lib/queries";
import { useSession } from "@/components/wallet/SessionProvider";
import { Avatar } from "@/components/ui/Identity";
import { CopyButton } from "@/components/ui/CopyButton";
import { CallCard } from "@/components/feed/CallCard";
import { Eyebrow } from "@/components/ui/Section";
import { displayNameOf, formatDate, formatInt, formatRelative, solscanAccount, solscanTx, truncateWallet } from "@/lib/format";

const REASON_LABEL: Record<string, string> = {
  AUTHOR_UPVOTE: "Upvote on your call",
  AUTHOR_BUYTHROUGH: "Buy-through on your call",
  BACKER_BUYTHROUGH: "You backed a call that played out",
  REVERSAL: "Reversal",
  VOID: "Voided by admin",
  ADJUSTMENT: "Adjustment",
};

export function ProfileView({ profile, calls, backed }: { profile: ProfileData; calls: CallCardData[]; backed: CallCardData[] }) {
  const { user, setUser } = useSession();
  const isSelf = user?.id === profile.user.id;
  const [following, setFollowing] = useState(profile.viewerFollows);
  const [followers, setFollowers] = useState(profile.followers);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.user.displayName ?? "");
  const [displayName, setDisplayName] = useState(profile.user.displayName);
  const [tab, setTab] = useState<"calls" | "backed" | "ledger">("calls");
  const [list, setList] = useState(calls);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggleFollow() {
    if (!user) {
      setMsg("Connect your wallet to follow.");
      return;
    }
    const res = await fetch(`/api/follow/${profile.user.wallet}`, { method: "POST" });
    const data = (await res.json()) as { following?: boolean; followers?: number; error?: string };
    if (!res.ok) {
      setMsg(data.error ?? "Failed");
      return;
    }
    setFollowing(!!data.following);
    setFollowers(data.followers ?? followers);
  }

  async function saveName() {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name.trim() || null }),
    });
    const data = (await res.json()) as { user?: { id: string; wallet: string; displayName: string | null; isAdmin: boolean }; error?: string };
    if (!res.ok || !data.user) {
      setMsg(data.error ?? "Could not save");
      return;
    }
    setDisplayName(data.user.displayName);
    setUser(data.user);
    setEditing(false);
  }

  const shown = { wallet: profile.user.wallet, displayName };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <Avatar wallet={profile.user.wallet} size={72} />
        <div className="flex-1 min-w-0">
          <Eyebrow className="mb-2">{isSelf ? "Your profile" : "Profile"}</Eyebrow>
          {editing ? (
            <div className="flex gap-2 items-center max-w-sm">
              <input className="input" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder="Display name" autoFocus />
              <button type="button" className="btn btn-primary btn-sm" onClick={() => void saveName()}>Save</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          ) : (
            <h1 className={`headline text-4xl sm:text-5xl leading-none ${displayName ? "" : "font-mono text-3xl sm:text-4xl"}`}>
              {displayNameOf(shown)}
              {isSelf && (
                <button type="button" onClick={() => setEditing(true)} className="ml-3 align-middle text-sm font-sans text-mute hover:text-fg">
                  edit
                </button>
              )}
            </h1>
          )}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
            <span className="font-mono text-fg2">{truncateWallet(profile.user.wallet, 6, 6)}</span>
            <CopyButton text={profile.user.wallet} />
            <a href={solscanAccount(profile.user.wallet)} target="_blank" rel="noreferrer" className="text-xs text-mute hover:text-fg">Solscan ↗</a>
            <span className="text-mute">· joined {formatRelative(profile.user.createdAt)}</span>
            {profile.user.isFlagged && <span className="chip status-missed">Restricted</span>}
          </div>
          {isSelf && (
            <p className="mt-2 text-xs text-fg2">This wallet is your account and your payout destination.</p>
          )}
        </div>
        <div className="flex gap-2 sm:self-start">
          {!isSelf && (
            <button type="button" onClick={() => void toggleFollow()} className={`btn ${following ? "btn-ghost" : "btn-primary"} btn-sm`}>
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-fire">{msg}</p>}

      <dl className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Stat label="Points" value={formatInt(profile.points)} big />
        <Stat label="Unpaid" value={formatInt(profile.unpaid)} />
        <Stat label="Win rate" value={profile.winRate == null ? "—" : `${Math.round(profile.winRate * 100)}%`} />
        <Stat label="Calls" value={`${profile.callsPosted}`} />
        <Stat label="Played out" value={`${profile.playedOut}`} tone="pink" />
        <Stat label="Followers" value={`${followers}`} />
      </dl>

      {profile.payouts.length > 0 && (
        <div className="mt-10">
          <Eyebrow className="mb-3">Paid out</Eyebrow>
          <ul className="card divide-y divide-line">
            {profile.payouts.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm flex-wrap">
                <span>
                  Paid: <span className="font-mono font-semibold">{p.amount} {p.token}</span>
                  <span className="text-fg2"> for {formatInt(p.points)} points</span>
                </span>
                <a href={solscanTx(p.txSignature)} target="_blank" rel="noreferrer" className="font-mono text-xs text-pink hover:underline">
                  {truncateWallet(p.txSignature, 8, 8)} ↗
                </a>
                <span className="text-xs text-mute">{formatDate(p.paidAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 flex gap-1">
        {(
          [
            ["calls", `Calls · ${calls.length}`],
            ["backed", `Backed · ${backed.length}`],
            ["ledger", "Ledger"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`px-3.5 py-1.5 font-display text-[15px] font-medium transition ${tab === k ? "bg-pink text-on-pink" : "text-fg2 hover:text-fg hover:bg-bg2"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "calls" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {list.map((c) => <CallCard key={c.id} call={c} onDeleted={(id) => setList((l) => l.filter((x) => x.id !== id))} />)}
          {list.length === 0 && <p className="text-fg2">No calls yet.</p>}
        </div>
      )}
      {tab === "backed" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {backed.map((c) => <CallCard key={c.id} call={c} />)}
          {backed.length === 0 && <p className="text-fg2">Hasn&apos;t backed anything yet.</p>}
        </div>
      )}
      {tab === "ledger" && (
        <div className="card mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {profile.ledger.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">
                    {REASON_LABEL[l.reason] ?? l.reason}
                    {l.note && <span className="text-mute"> · {l.note}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-mute hidden sm:table-cell">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-mute">{l.paid ? "paid" : ""}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${l.delta < 0 ? "text-pink" : "text-pink"}`}>
                    {l.delta > 0 ? "+" : ""}{l.delta}
                  </td>
                </tr>
              ))}
              {profile.ledger.length === 0 && <tr><td className="px-4 py-8 text-center text-fg2">No points yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, big, tone }: { label: string; value: string; big?: boolean; tone?: "pink" }) {
  return (
    <div className="card p-4">
      <dt className="text-[11px] uppercase tracking-wider text-mute">{label}</dt>
      <dd className={`mt-1 font-mono ${big ? "text-3xl" : "text-xl"} ${tone === "pink" ? "text-pink" : ""}`}>{value}</dd>
    </div>
  );
}
