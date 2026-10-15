"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CallCardData, FeedTab } from "@/lib/queries";
import { CallCard } from "./CallCard";
import { useSession } from "@/components/wallet/SessionProvider";

const TABS: { key: FeedTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "following", label: "Following" },
  { key: "live", label: "Live" },
  { key: "played_out", label: "Played out" },
  { key: "missed", label: "Missed" },
];

export function FeedList({ initial, initialTab }: { initial: { calls: CallCardData[]; nextCursor: string | null }; initialTab: FeedTab }) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: sessionLoading } = useSession();
  const lastViewer = useRef<string | null | undefined>(undefined);
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [calls, setCalls] = useState(initial.calls);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: FeedTab, c: string | null, append: boolean) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ tab: t });
      if (c) qs.set("cursor", c);
      const res = await fetch(`/api/feed?${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { calls: CallCardData[]; nextCursor: string | null };
      setCalls((prev) => (append ? [...prev, ...data.calls] : data.calls));
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with ?tab= changes (e.g. nav pill link) and re-fetch when the session changes.
  useEffect(() => {
    const t = (params.get("tab") as FeedTab | null) ?? "all";
    if (TABS.some((x) => x.key === t) && t !== tab) {
      setTab(t);
      void load(t, null, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // The server already rendered with the viewer's cookie, so only refetch when the
  // viewer changes after load (sign in / sign out), not on first mount.
  useEffect(() => {
    if (sessionLoading) return;
    const id = user?.id ?? null;
    if (lastViewer.current === undefined) {
      lastViewer.current = id;
      return;
    }
    if (lastViewer.current !== id) {
      lastViewer.current = id;
      void load(tab, null, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, user?.id]);

  function choose(t: FeedTab) {
    setTab(t);
    router.replace(t === "all" ? "/feed" : `/feed?tab=${t}`, { scroll: false });
    void load(t, null, false);
  }

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => choose(t.key)}
            className={`px-3.5 py-1.5 font-display text-[15px] font-medium whitespace-nowrap transition ${
              tab === t.key ? "bg-pink text-on-pink" : "text-fg2 hover:text-fg hover:bg-bg2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {calls.map((c) => (
          <CallCard key={c.id} call={c} onDeleted={(id) => setCalls((cs) => cs.filter((x) => x.id !== id))} />
        ))}
      </div>

      {!loading && calls.length === 0 && (
        <div className="card p-10 text-center text-fg2 mt-6">
          {tab === "following"
            ? user
              ? "Nobody you follow has posted yet. Find people on the board."
              : "Connect your wallet to see calls from people you follow."
            : "Nothing here yet. Be the first to put something on the tape."}
        </div>
      )}

      {loading && <p className="mt-6 text-center text-sm text-mute">Loading…</p>}

      {cursor && !loading && (
        <div className="mt-8 text-center">
          <button type="button" className="btn btn-ghost" onClick={() => void load(tab, cursor, true)}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
