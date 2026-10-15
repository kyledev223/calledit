import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { markPaid } from "@/lib/admin";

const Body = z.object({
  wallet: z.string().min(20).max(64),
  txSignature: z.string().trim().min(40).max(120),
  note: z.string().trim().max(200).optional(),
});

/**
 * Mark a wallet's unpaid balance as paid. The admin has already sent the
 * tokens from their own wallet; we only record the signature. The app never
 * holds or moves funds.
 */
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin();
  const body = Body.parse(await readJson(req));
  const payout = await markPaid({ ...body, paidBy: admin.wallet });
  return json({ payout });
});
