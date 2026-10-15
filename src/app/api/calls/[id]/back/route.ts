import { handler, json, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { toggleBuyThrough } from "@/lib/calls";

type Ctx = { params: Promise<{ id: string }> };

/** Buy-through: a points-only endorsement that puts your name on the call. No money moves. */
export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  if (me.isFlagged) throw new ApiError("This wallet has been restricted from backing calls.", 403);
  const { id } = await ctx.params;
  return json(await toggleBuyThrough(id, me.id));
});
