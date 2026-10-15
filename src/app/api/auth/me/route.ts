import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, json, readJson } from "@/lib/api";
import { getCurrentUser, requireUser } from "@/lib/auth/session";

export const GET = handler(async () => {
  const user = await getCurrentUser();
  return json({ user });
});

const Patch = z.object({
  displayName: z
    .string()
    .trim()
    .max(32)
    .regex(/^[\p{L}\p{N} _.\-]*$/u, "Letters, numbers, spaces, dots, dashes and underscores only")
    .nullable(),
});

/** Update the optional display name. */
export const PATCH = handler(async (req: Request) => {
  const me = await requireUser();
  const { displayName } = Patch.parse(await readJson(req));
  const user = await prisma.user.update({
    where: { id: me.id },
    data: { displayName: displayName ? displayName : null },
    select: { id: true, wallet: true, displayName: true },
  });
  return json({ user: { ...user, isAdmin: me.isAdmin } });
});
