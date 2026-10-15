import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, json, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { getPayoutSettings, SETTING_KEYS } from "@/lib/admin";

export const GET = handler(async () => {
  await requireAdmin();
  return json(await getPayoutSettings());
});

const Body = z.object({
  rate: z.number().positive().finite(), // tokens per point
  token: z.string().trim().min(1).max(16),
});

export const PUT = handler(async (req: Request) => {
  await requireAdmin();
  const { rate, token } = Body.parse(await readJson(req));
  await prisma.$transaction([
    prisma.setting.upsert({ where: { key: SETTING_KEYS.rate }, update: { value: String(rate) }, create: { key: SETTING_KEYS.rate, value: String(rate) } }),
    prisma.setting.upsert({ where: { key: SETTING_KEYS.token }, update: { value: token.toUpperCase() }, create: { key: SETTING_KEYS.token, value: token.toUpperCase() } }),
  ]);
  return json(await getPayoutSettings());
});
