import { handler, json } from "@/lib/api";
import { getActiveAssets } from "@/lib/queries";

export const GET = handler(async () => {
  const assets = await getActiveAssets();
  return json({
    assets: assets.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      category: a.category,
      decimals: a.decimals,
      source: a.source,
    })),
  });
});
