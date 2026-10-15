import { handler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { deleteOwnCall } from "@/lib/calls";

type Ctx = { params: Promise<{ id: string }> };

/** Delete your own call. Played-out awards are reversed for everyone involved. */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const result = await deleteOwnCall(id, me.id);
  return json({ ok: true, ...result });
});
