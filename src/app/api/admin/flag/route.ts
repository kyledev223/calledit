import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, json, readJson, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";

const Body = z.object({
  wallet: z.string().min(20).max(64),
  flagged: z.boolean(),
  note: z.string().trim().max(200).optional(),
});

/** Restrict (or restore) a wallet's ability to post and back. */
export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const { wallet, flagged, note } = Body.parse(await readJson(req));
  const user = await prisma.user.findUnique({ where: { wallet } });
  if (!user) throw new ApiError("No such wallet.", 404);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isFlagged: flagged, flagNote: flagged ? note ?? user.flagNote : null },
    select: { wallet: true, isFlagged: true, flagNote: true },
  });
  return json({ user: updated });
});
