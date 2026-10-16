"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { SocialLinks } from "@/components/SocialLinks";
import { SITE_NAME } from "@/lib/site";

const links = [
  { href: "/feed", label: "Tape" },
  { href: "/board", label: "Board" },
  { href: "/how", label: "How it works" },
];

interface Stats {
  callsLive: number;
  btc: { price: number } | null;
}

export function Nav() {
  const pathname = usePathname();
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Stats;
        if (alive) setStats(data);
      } catch {
        /* keep last */
      }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/[0.88] backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="shrink-0" aria-label={`${SITE_NAME} home`}>
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 font-display text-[15px] font-medium transition ${
                pathname === l.href ? "text-pink" : "text-fg2 hover:text-pink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LivePill stats={stats} />
          <SocialLinks className="hidden lg:flex" />
          <ConnectButton size="sm" />
          <button
            type="button"
            className="md:hidden btn btn-ghost btn-sm px-2.5"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line bg-page px-4 py-2 animate-rise">
          <p className="px-2 py-2.5 font-mono text-xs text-fg2 min-[400px]:hidden">BTC <b className="text-pink font-medium">{stats?.btc ? formatUsd(stats.btc.price, 0) : "…"}</b> · {stats ? stats.callsLive : "…"} calls live</p>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block px-2 py-2.5 font-display text-[15px] text-fg2 hover:text-pink">
              {l.label}
            </Link>
          ))}
          <Link href="/you" className="block px-2 py-2.5 font-display text-[15px] text-fg2 hover:text-pink">You</Link>
          <SocialLinks variant="label" className="px-2 pt-2 pb-3" />
        </nav>
      )}
    </header>
  );
}

function LivePill({ stats }: { stats: Stats | null }) {
  return (
    <Link
      href="/feed?tab=live"
      className="hidden min-[400px]:inline-flex md:hidden lg:inline-flex items-center gap-2 bg-card border border-line2 px-2.5 sm:px-3 h-10 font-mono text-[11px] sm:text-xs text-fg2 hover:border-pink transition shrink-0"
      title="Live market and tape status"
    >
      <span className="size-1.5 bg-pink animate-pulse-dot shrink-0" aria-hidden />
      <span className="sm:hidden">BTC <b className="text-pink font-medium">{stats?.btc ? formatCompactUsd(stats.btc.price) : "…"}</b></span>
      <span className="hidden sm:inline">
        BTC <b className="text-pink font-medium">{stats?.btc ? formatUsd(stats.btc.price, 0) : "…"}</b> · <b className="text-pink font-medium">{stats ? stats.callsLive : "…"}</b> calls live
      </span>
    </Link>
  );
}
