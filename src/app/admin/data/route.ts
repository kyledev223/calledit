import { handler, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Refresh endpoint for the admin dashboard. */
export const GET = handler(async () => {
  await requireAdmin();
  return json(await getAdminOverview());
});
