"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { SessionProvider } from "@/components/wallet/SessionProvider";

/**
 * Wallet + session providers.
 *
 * ConnectionProvider is required by the adapter for environment detection only.
 * This app never sends a transaction through it; the only wallet call we make
 * is `signMessage` (see src/lib/auth/client.ts and tests/no-transaction.test.ts).
 *
 * Backpack, OKX Wallet and any other Wallet Standard wallet are detected automatically by
 * wallet-adapter-react, so only legacy adapters for Phantom and Solflare are
 * listed explicitly.
 *
 * Adding EVM later: wrap children in WagmiProvider + RainbowKitProvider here
 * and register an EVM provider in src/lib/auth/providers.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect={false}>
        <SessionProvider>{children}</SessionProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
