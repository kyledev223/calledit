import { env } from "@/lib/env";
import { handler, json, ApiError } from "@/lib/api";
import { resolveLiveCalls } from "@/lib/resolver";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called every minute by Vercel Cron (see vercel.json) with
 * "Authorization: Bearer $CRON_SECRET". Can also be hit manually or by any
 * external scheduler that sends the same header.
 */
async function run(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : new URL(req.url).searchParams.get("secret") ?? "";
  if (!env.cronSecret || token !== env.cronSecret) throw new ApiError("Unauthorized", 401);
  const summary = await resolveLiveCalls();
  return json({ ok: true, ranAt: new Date().toISOString(), ...summary });
}

export const GET = handler(run);
export const POST = handler(run);
