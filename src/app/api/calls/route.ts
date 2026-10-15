import { z } from "zod";
import { handler, json, readJson, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { createCall } from "@/lib/calls";

const Body = z.object({
  asset: z.string().min(1).max(16),
  direction: z.enum(["ABOVE", "BELOW"]),
  level: z.number().positive().finite(),
  expiresAt: z.string().datetime(),
});

/** Post a call. Free, no capital, no transaction. */
export const POST = handler(async (req: Request) => {
  const me = await requireUser();
  if (me.isFlagged) throw new ApiError("This wallet has been restricted from posting.", 403);
  const body = Body.parse(await readJson(req));
  const call = await createCall({
    userId: me.id,
    assetSymbol: body.asset.toUpperCase(),
    direction: body.direction,
    level: body.level,
    expiresAt: new Date(body.expiresAt),
  });
  return json({ id: call.id }, { status: 201 });
});
