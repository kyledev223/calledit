import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { toggleUpvote } from "@/lib/calls";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  return json(await toggleUpvote(id, me.id));
});
