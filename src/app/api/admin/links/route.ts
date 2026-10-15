import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, json, readJson, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";

const Body = z.object({
  walletA: z.string().min(20).max(64),
  walletB: z.string().min(20).max(64),
  note: z.string().trim().max(200).optional(),
});

/** Flag two wallets as linked: neither may back the other's calls. */
export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin();
  const { walletA, walletB, note } = Body.parse(await readJson(req));
  if (walletA === walletB) throw new ApiError("Pick two different wallets.");
  const [a, b] = await Promise.all([
    prisma.user.findUnique({ where: { wallet: walletA } }),
    prisma.user.findUnique({ where: { wallet: walletB } }),
  ]);
  if (!a || !b) throw new ApiError("Both wallets must exist on the tape.", 404);
  const [userAId, userBId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  const link = await prisma.walletLink.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: { note },
    create: { userAId, userBId, note, createdBy: admin.wallet },
  });
  return json({ link });
});

export const DELETE = handler(async (req: Request) => {
  await requireAdmin();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError("id is required");
  await prisma.walletLink.delete({ where: { id } });
  return json({ ok: true });
});
