import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedList } from "@/components/feed/FeedList";
import { Eyebrow, Heading } from "@/components/ui/Section";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeed, type FeedTab } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The tape" };

const TABS: FeedTab[] = ["all", "following", "live", "played_out", "missed"];

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const tab = (TABS.includes(tabParam as FeedTab) ? tabParam : "all") as FeedTab;
  const me = await getCurrentUser();
  const page = await getFeed({ tab, viewerId: me?.id });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <Eyebrow className="mb-3">The tape</Eyebrow>
      <Heading lead="Every call," accent="in order." />
      <p className="mt-3 text-fg2 max-w-xl">Newest first. Live calls show the distance to their level; resolved ones show the price that decided them.</p>
      <div className="mt-8">
        <Suspense>
          <FeedList initial={page} initialTab={tab} />
        </Suspense>
      </div>
    </div>
  );
}
