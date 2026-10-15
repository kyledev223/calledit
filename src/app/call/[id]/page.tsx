import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCallById } from "@/lib/queries";
import { CallCard } from "@/components/feed/CallCard";
import { Eyebrow } from "@/components/ui/Section";
import { formatDate, formatUsd } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/assets";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await getCallById(id);
  return { title: c ? `${c.asset.symbol} ${c.direction.toLowerCase()} ${formatUsd(c.level, c.asset.decimals)}` : "Call" };
}

export default async function CallPage({ params }: Props) {
  const { id } = await params;
  const me = await getCurrentUser();
  const call = await getCallById(id, me?.id);
  if (!call) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <Link href="/feed" className="text-sm text-fg2 hover:text-fg">← Back to the tape</Link>
      <div className="mt-6">
        <CallCard call={call} />
      </div>
      {call.status !== "LIVE" && call.resolvedPrice != null && (
        <div className="card mt-6 p-5">
          <Eyebrow className="mb-2">Resolution proof</Eyebrow>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <Item k="Price seen" v={formatUsd(call.resolvedPrice, call.asset.decimals)} mono />
            <Item k="Source" v={call.resolvedSource ? SOURCE_LABEL[call.resolvedSource] : "—"} />
            <Item k="Observed at" v={call.resolvedPriceAt ? formatDate(call.resolvedPriceAt) : "—"} />
            <Item k="Decided at" v={call.resolvedAt ? formatDate(call.resolvedAt) : "—"} />
            <Item k="Level" v={formatUsd(call.level, call.asset.decimals)} mono />
            <Item k="Price at post" v={formatUsd(call.priceAtPost, call.asset.decimals)} mono />
          </dl>
        </div>
      )}
    </div>
  );
}

function Item({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-mute text-xs uppercase tracking-wider">{k}</dt>
      <dd className={`mt-1 ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  );
}
