import type { ChainAuthProvider, ChainId } from "../types";
import { solanaAuthProvider } from "./solana";
import { evmAuthProvider } from "./evm";

const providers: Partial<Record<ChainId, ChainAuthProvider>> = {
  SOLANA: solanaAuthProvider,
  ...(evmAuthProvider ? { EVM: evmAuthProvider } : {}),
};

export function getAuthProvider(chain: ChainId): ChainAuthProvider {
  const p = providers[chain];
  if (!p) throw new Error(`Auth provider for ${chain} is not enabled`);
  return p;
}

export const enabledChains = Object.keys(providers) as ChainId[];
