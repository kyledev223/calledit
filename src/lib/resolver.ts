import { prisma } from "@/lib/prisma";
import { getQuote, getRangeSince } from "@/lib/prices";
import { evaluateCall, type Observation } from "@/lib/resolution";
import { awardForCall } from "@/lib/points";

export interface ResolveSummary {
  checked: number;
  playedOut: number;
  missed: number;
  errors: number;
  details: Array<{ id: string; outcome: string; price?: number; source?: string; error?: string }>;
}

/**
 * Cron entry point. Checks every LIVE call against its price feed.
 *
 * For each asset we fetch one quote and (when the feed supports it) the
 * high/low since that call's last check, so a wick between cron ticks still
 * counts as "traded through". The observation that triggered the decision is
 * stored on the call as proof.
 */
export async function resolveLiveCalls(now = new Date()): Promise<ResolveSummary> {
  const live = await prisma.call.findMany({
    where: { status: "LIVE" },
    include: { asset: true },
    orderBy: { expiresAt: "asc" },
  });

  const summary: ResolveSummary = { checked: 0, playedOut: 0, missed: 0, errors: 0, details: [] };

  // Group by asset so we hit each feed once per tick.
  const byAsset = new Map<string, typeof live>();
  for (const c of live) {
    const arr = byAsset.get(c.assetId) ?? [];
    arr.push(c);
    byAsset.set(c.assetId, arr);
  }

  for (const calls of byAsset.values()) {
    const asset = calls[0].asset;
    let quote: Awaited<ReturnType<typeof getQuote>>;
    try {
      quote = await getQuote(asset);
    } catch (e) {
      // Feed down: expire anything past its deadline anyway, leave the rest for next tick.
      for (const c of calls) {
        summary.checked++;
        if (c.expiresAt.getTime() <= now.getTime()) {
          // Without a price we cannot prove it traded through, so it's a miss.
          await prisma.call.update({
            where: { id: c.id },
            data: { status: "MISSED", resolvedAt: now, lastCheckedAt: now },
          });
          summary.missed++;
          summary.details.push({ id: c.id, outcome: "MISSED" });
        } else {
          summary.errors++;
          summary.details.push({ id: c.id, outcome: "LIVE", error: e instanceof Error ? e.message : "feed error" });
        }
      }
      continue;
    }

    // Earliest "since" among these calls bounds one range request per asset.
    const earliest = calls.reduce(
      (min, c) => Math.min(min, (c.lastCheckedAt ?? c.createdAt).getTime()),
      Number.POSITIVE_INFINITY,
    );
    const range = await getRangeSince(asset, new Date(earliest));

    for (const c of calls) {
      summary.checked++;
      try {
        const since = c.lastCheckedAt ?? c.createdAt;
        // Only trust the range if it actually covers this call's window.
        const rangeApplies = range && range.from.getTime() <= since.getTime() + 2 * 60_000;
        const obs: Observation = {
          price: quote.price,
          high: rangeApplies ? range.high : undefined,
          low: rangeApplies ? range.low : undefined,
          // Observation time is clamped to "now": a feed cannot report the future.
          at: new Date(Math.min(quote.at.getTime(), now.getTime())),
        };
        // If the range extends past expiry, the spot quote still decides and the
        // range only helps when the range window ended before expiry.
        if (rangeApplies && range.to.getTime() > c.expiresAt.getTime()) {
          obs.high = undefined;
          obs.low = undefined;
        }
        const outcome = evaluateCall(
          { direction: c.direction, level: Number(c.level), expiresAt: c.expiresAt },
          obs,
          now,
        );

        if (outcome === "PLAYED_OUT") {
          const proofPrice =
            obs.high != null && c.direction === "ABOVE" && obs.high >= Number(c.level)
              ? obs.high
              : obs.low != null && c.direction === "BELOW" && obs.low <= Number(c.level)
                ? obs.low
                : quote.price;
          await prisma.$transaction(async (tx) => {
            const updated = await tx.call.updateMany({
              where: { id: c.id, status: "LIVE" },
              data: {
                status: "PLAYED_OUT",
                resolvedAt: now,
                resolvedPrice: proofPrice,
                resolvedSource: range && proofPrice !== quote.price ? range.source : quote.source,
                resolvedPriceAt: obs.at,
                lastCheckedAt: now,
              },
            });
            if (updated.count === 1) await awardForCall(tx, c.id);
          });
          summary.playedOut++;
          summary.details.push({ id: c.id, outcome, price: proofPrice, source: quote.source });
        } else if (outcome === "MISSED") {
          await prisma.call.updateMany({
            where: { id: c.id, status: "LIVE" },
            data: {
              status: "MISSED",
              resolvedAt: now,
              resolvedPrice: quote.price,
              resolvedSource: quote.source,
              resolvedPriceAt: obs.at,
              lastCheckedAt: now,
            },
          });
          summary.missed++;
          summary.details.push({ id: c.id, outcome, price: quote.price, source: quote.source });
        } else {
          await prisma.call.update({ where: { id: c.id }, data: { lastCheckedAt: now } });
        }
      } catch (e) {
        summary.errors++;
        summary.details.push({ id: c.id, outcome: "ERROR", error: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  return summary;
}
