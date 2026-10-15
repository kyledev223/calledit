import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { handler, json, readJson, ApiError } from "@/lib/api";
import { getAuthProvider } from "@/lib/auth/providers";
import { newToken, NONCE_TTL_MS } from "@/lib/auth/session";

const Body = z.object({
  address: z.string().min(20).max(64),
  chain: z.enum(["SOLANA", "EVM"]).default("SOLANA"),
});

/**
 * Step 1 of sign-in: issue a nonce and the exact message to sign.
 * Nothing here touches funds; the message states that explicitly.
 */
export const POST = handler(async (req: Request) => {
  const { address, chain } = Body.parse(await readJson(req));
  const provider = getAuthProvider(chain);
  if (!provider.isValidAddress(address)) throw new ApiError("That doesn't look like a valid wallet address.");

  const nonce = newToken(16);
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + NONCE_TTL_MS);
  await prisma.authNonce.create({ data: { nonce, wallet: address, chain, issuedAt, expiresAt } });

  const message = provider.buildMessage({
    domain: env.appDomain,
    uri: env.appUrl,
    address,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
  return json({ message, nonce, expiresAt: expiresAt.toISOString() });
});
