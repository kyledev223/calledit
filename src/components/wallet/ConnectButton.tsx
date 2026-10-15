"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useSession } from "./SessionProvider";
import { truncateWallet } from "@/lib/format";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";

export function Reassurance({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-fg2 ${className}`}>
      Signing in is free. We never ask to move your funds.
    </p>
  );
}

export function ConnectButton({ size = "md" }: { size?: "sm" | "md" }) {
  const { user, loading, signingIn, error, signOut, needsName, dismissNamePrompt, setUser } = useSession();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user) setPickerOpen(false);
  }, [user]);

  const sizeCls = size === "sm" ? "btn-sm" : "";

  if (loading) {
    return <div className={`btn btn-ghost ${sizeCls} opacity-60`}>…</div>;
  }

  if (user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`btn btn-ghost ${sizeCls} font-mono`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="inline-block size-2 bg-pink shrink-0" aria-hidden />
          <span className={`truncate max-w-[22vw] sm:max-w-[160px] ${user.displayName ? "font-sans" : ""}`}>
            {user.displayName ?? truncateWallet(user.wallet)}
          </span>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="card absolute right-0 mt-2 w-64 p-2 z-50 animate-rise"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-mono text-sm">{truncateWallet(user.wallet)}</span>
              <CopyButton text={user.wallet} />
            </div>
            <div className="rule my-1" />
            <MenuLink href="/you" onClick={() => setMenuOpen(false)}>Your profile</MenuLink>
            {user.isAdmin && (
              <MenuLink href="/admin" onClick={() => setMenuOpen(false)}>Admin</MenuLink>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="w-full text-left px-3 py-2 text-sm hover:bg-bg2 text-fg2"
            >
              Sign out
            </button>
          </div>
        )}
        {needsName && <NamePrompt onDone={(u) => { setUser(u); dismissNamePrompt(); }} onSkip={dismissNamePrompt} />}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={`btn btn-primary ${sizeCls}`}
        disabled={signingIn}
      >
        {signingIn ? (
          "Check your wallet…"
        ) : (
          <>
            <span className={size === "sm" ? "sm:hidden" : "hidden"}>Connect</span>
            <span className={size === "sm" ? "hidden sm:inline" : ""}>Connect wallet</span>
          </>
        )}
      </button>
      {pickerOpen && <WalletPicker onClose={() => setPickerOpen(false)} error={error} signingIn={signingIn} />}
    </>
  );
}

function MenuLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="block px-3 py-2 text-sm hover:bg-bg2">
      {children}
    </Link>
  );
}

function WalletPicker({ onClose, error, signingIn }: { onClose: () => void; error: string | null; signingIn: boolean }) {
  const { wallets, select, connect, wallet, connected, connecting } = useWallet();
  const [pending, setPending] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Once an adapter is selected, connect to it.
  useEffect(() => {
    if (!pending || !wallet || wallet.adapter.name !== pending || connected || connecting) return;
    connect().catch((e: unknown) => {
      setLocalError(e instanceof Error ? e.message : "Could not connect");
      setPending(null);
    });
  }, [pending, wallet, connected, connecting, connect]);

  const installed = wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  );
  const notInstalled = wallets.filter((w) => !installed.includes(w));

  return (
    <Modal onClose={onClose} title="Connect a wallet">
      <p className="text-sm text-fg2 mb-4">
        You&apos;ll sign one plain-text message to prove you own the wallet. That&apos;s it.
      </p>
      <ul className="space-y-2">
        {installed.map((w) => (
          <li key={w.adapter.name}>
            <button
              type="button"
              disabled={signingIn || connecting}
              onClick={() => {
                setLocalError(null);
                setPending(w.adapter.name);
                select(w.adapter.name);
              }}
              className="w-full flex items-center gap-3 border border-line bg-card px-4 py-3 text-left hover:border-line2 hover:bg-bg2 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.adapter.icon} alt="" className="size-7" />
              <span className="font-semibold">{w.adapter.name}</span>
              <span className="ml-auto text-xs text-mute">
                {pending === w.adapter.name && (connecting || signingIn) ? "Waiting…" : "Detected"}
              </span>
            </button>
          </li>
        ))}
        {installed.length === 0 && (
          <li className="text-sm text-fg2 border border-dashed border-line2 p-4">
            No Solana wallet detected. Install Phantom, Solflare or Backpack, then reload.
          </li>
        )}
      </ul>
      {notInstalled.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-mute cursor-pointer">Other wallets</summary>
          <ul className="mt-2 space-y-1">
            {notInstalled.map((w) => (
              <li key={w.adapter.name}>
                <a href={w.adapter.url} target="_blank" rel="noreferrer" className="text-sm text-fg2 hover:text-fg">
                  Get {w.adapter.name} ↗
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      {(localError || error) && <p className="mt-4 text-sm text-fire">{localError ?? error}</p>}
      <div className="mt-5 bg-bg2 p-3 text-xs text-fg2 leading-relaxed">
        <strong className="text-fg">Signing in is free. We never ask to move your funds.</strong> The message you sign says so
        in plain words. Called It never requests a transaction, approval or delegation.
      </div>
    </Modal>
  );
}

function NamePrompt({ onDone, onSkip }: { onDone: (u: { id: string; wallet: string; displayName: string | null; isAdmin: boolean }) => void; onSkip: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: name.trim() || null }),
      });
      const data = (await res.json()) as { user?: { id: string; wallet: string; displayName: string | null; isAdmin: boolean }; error?: string };
      if (!res.ok || !data.user) throw new Error(data.error ?? "Could not save");
      onDone(data.user);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onSkip} title="What should we call you?">
      <p className="text-sm text-fg2 mb-4">
        Optional. Your wallet address is your account and where payouts go. A name just makes the tape easier to read.
      </p>
      <input
        className="input"
        placeholder="e.g. quietwhale"
        maxLength={32}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      {err && <p className="mt-2 text-sm text-fire">{err}</p>}
      <div className="mt-4 flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSkip}>Skip for now</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save name"}
        </button>
      </div>
    </Modal>
  );
}
