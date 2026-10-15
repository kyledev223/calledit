import type { ChainAuthProvider } from "../types";

/**
 * Placeholder for an EVM provider (SIWE / EIP-4361 via wagmi + RainbowKit).
 *
 * To enable:
 *  1. npm i wagmi viem @rainbow-me/rainbowkit siwe
 *  2. Implement buildMessage/parseMessage with the `siwe` package and
 *     verifySignature with viem's `verifyMessage` (EIP-191 personal_sign).
 *  3. Register in ./index.ts and add a RainbowKit connect button in
 *     src/components/wallet. The User.chain column already accepts "EVM".
 *
 * Same hard rule applies: message signatures only, never a transaction.
 */
export const evmAuthProvider: ChainAuthProvider | null = null;
