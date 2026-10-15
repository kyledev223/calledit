import { z } from "zod";
import { handler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { voidPoints } from "@/lib/admin";

const Body = z.object({
  wallet: z.string().min(20).max(64),
  /** Points to void. Omit to void the entire unpaid balance. */
  points: z.number().int().positive().optional(),
  note: z.string().trim().max(200).optional(),
});

export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin();
  const body = Body.parse(await readJson(req));
  const result = await voidPoints({ ...body, by: admin.wallet });
  return json(result);
});
