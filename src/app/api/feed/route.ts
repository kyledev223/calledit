import { handler, json } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeed, type FeedTab } from "@/lib/queries";

const TABS: FeedTab[] = ["all", "following", "live", "played_out", "missed"];

export const GET = handler(async (req: Request) => {
  const url = new URL(req.url);
  const tabParam = url.searchParams.get("tab") ?? "all";
  const tab = (TABS.includes(tabParam as FeedTab) ? tabParam : "all") as FeedTab;
  const cursor = url.searchParams.get("cursor");
  const me = await getCurrentUser();
  const page = await getFeed({ tab, viewerId: me?.id, cursor, take: 30 });
  return json(page);
});
