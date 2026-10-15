"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { signInWithWallet } from "@/lib/auth/client";

export interface SessionUser {
  id: string;
  wallet: string;
  displayName: string | null;
  isAdmin: boolean;
}

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  /** True right after a brand-new wallet signs in; used to prompt for a display name. */
  needsName: boolean;
  dismissNamePrompt: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const attemptedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: SessionUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      setError("This wallet can't sign messages. Try Phantom, Solflare or Backpack.");
      return;
    }
    setSigningIn(true);
    setError(null);
    try {
      // Only signMessage is ever used. Never a transaction.
      const result = await signInWithWallet({
        address: wallet.publicKey.toBase58(),
        signMessage: wallet.signMessage,
      });
      setUser({
        id: result.user.id,
        wallet: result.user.wallet,
        displayName: result.user.displayName,
        isAdmin: result.user.isAdmin,
      });
      if (result.user.isNew || !result.user.displayName) setNeedsName(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      try {
        await wallet.disconnect();
      } catch {
        /* ignore */
      }
    } finally {
      setSigningIn(false);
    }
  }, [wallet]);

  // When a wallet connects and the connected address isn't the signed-in one, sign in.
  useEffect(() => {
    const addr = wallet.publicKey?.toBase58();
    if (!wallet.connected || !addr || loading) return;
    if (user?.wallet === addr) return;
    if (attemptedFor.current === addr) return;
    attemptedFor.current = addr;
    void signIn();
  }, [wallet.connected, wallet.publicKey, loading, user, signIn]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    attemptedFor.current = null;
    try {
      await wallet.disconnect();
    } catch {
      /* ignore */
    }
  }, [wallet]);

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      signingIn,
      error,
      needsName,
      dismissNamePrompt: () => setNeedsName(false),
      signIn,
      signOut,
      refresh,
      setUser,
    }),
    [user, loading, signingIn, error, needsName, signIn, signOut, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
