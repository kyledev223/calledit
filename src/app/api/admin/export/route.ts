import { handler } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getUnpaidBalances, getPayoutSettings, toCsv } from "@/lib/admin";

/** CSV of wallet, unpaid points, token amount at the current rate. */
export const GET = handler(async () => {
  await requireAdmin();
  const [rows, settings] = await Promise.all([getUnpaidBalances(), getPayoutSettings()]);
  const csv = toCsv(rows, settings);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="called-it-payouts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
