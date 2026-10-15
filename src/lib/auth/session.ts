import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env, isAdminWallet } from "@/lib/env";

export const SESSION_COOKIE = "receipts_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const NONCE_TTL_MS = 1000 * 60 * 10; // 10 minutes

export function hashToken(token: string): string {
  return createHash("sha256").update(`${env.sessionSecret}:${token}`).digest("hex");
}

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export type SessionUser = {
  id: string;
  wallet: string;
  chain: "SOLANA" | "EVM";
  displayName: string | null;
  isAdmin: boolean;
  isFlagged: boolean;
};

export async function getSessionUserFromToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return {
    id: u.id,
    wallet: u.wallet,
    chain: u.chain,
    displayName: u.displayName,
    isAdmin: isAdminWallet(u.wallet),
    isFlagged: u.isFlagged,
  };
}

/** Server components / route handlers: current user or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  return getSessionUserFromToken(jar.get(SESSION_COOKIE)?.value);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new AuthError("Connect your wallet to do that.", 401);
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (!u.isAdmin) throw new AuthError("Admin only.", 403);
  return u;
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}
