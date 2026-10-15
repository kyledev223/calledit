import { prisma } from "@/lib/prisma";
import { handler, json, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";

type Ctx = { params: Promise<{ wallet: string }> };

/** Toggle follow on a wallet. */
export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { wallet } = await ctx.params;
  const target = await prisma.user.findUnique({ where: { wallet }, select: { id: true } });
  if (!target) throw new ApiError("No such wallet on the tape.", 404);
  if (target.id === me.id) throw new ApiError("You can't follow yourself.");
  const key = { followerId: me.id, followingId: target.id };
  const existing = await prisma.follow.findUnique({ where: { followerId_followingId: key } });
  if (existing) await prisma.follow.delete({ where: { id: existing.id } });
  else await prisma.follow.create({ data: key });
  const followers = await prisma.follow.count({ where: { followingId: target.id } });
  return json({ following: !existing, followers });
});
