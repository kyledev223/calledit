import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env, isAdminWallet } from "@/lib/env";
import { handler, json, readJson, ApiError } from "@/lib/api";
import { getAuthProvider } from "@/lib/auth/providers";
import { NO_SPEND_STATEMENT } from "@/lib/auth/types";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";

const Body = z.object({
  address: z.string().min(20).max(64),
  chain: z.enum(["SOLANA", "EVM"]).default("SOLANA"),
  message: z.string().min(50).max(2000),
  signature: z.string().min(40).max(200),
});

/**
 * Step 2 of sign-in: verify the signed message, consume the nonce, open a session.
 * Pure signature verification (tweetnacl). No RPC calls, no transactions.
 */
export const POST = handler(async (req: Request) => {
  const { address, chain, message, signature } = Body.parse(await readJson(req));
  const provider = getAuthProvider(chain);

  const parsed = provider.parseMessage(message);
  if (!parsed) throw new ApiError("Malformed sign-in message.");
  if (parsed.address !== address) throw new ApiError("Message address does not match wallet.");
  if (parsed.domain !== env.appDomain) throw new ApiError("Message domain does not match this site.");
  if (parsed.statement !== NO_SPEND_STATEMENT) throw new ApiError("Message statement was altered.");

  const now = new Date();
  if (new Date(parsed.expiresAt) < now) throw new ApiError("Sign-in message expired. Try again.");
  if (new Date(parsed.issuedAt) > new Date(now.getTime() + 60_000)) throw new ApiError("Sign-in message is from the future.");

  const nonce = await prisma.authNonce.findUnique({ where: { nonce: parsed.nonce } });
  if (!nonce || nonce.wallet !== address || nonce.usedAt || nonce.expiresAt < now) {
    throw new ApiError("Nonce is invalid or already used.");
  }

  if (!provider.verifySignature({ message, signature, address })) {
    throw new ApiError("Signature could not be verified.", 401);
  }

  await prisma.authNonce.update({ where: { id: nonce.id }, data: { usedAt: now } });

  const existing = await prisma.user.findUnique({ where: { wallet: address } });
  const user =
    existing ??
    (await prisma.user.create({ data: { wallet: address, chain } }));
  if (existing) await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: now } });

  const { token, expiresAt } = await createSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));

  return json({
    user: {
      id: user.id,
      wallet: user.wallet,
      displayName: user.displayName,
      isAdmin: isAdminWallet(user.wallet),
      isNew: !existing,
    },
  });
});
