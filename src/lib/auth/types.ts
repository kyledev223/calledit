/**
 * Chain-agnostic auth provider contract.
 *
 * Solana is implemented today (Sign-In With Solana). An EVM provider
 * (wagmi + RainbowKit + SIWE) can be added by implementing this interface in
 * ./providers/evm.ts and registering it in ./providers/index.ts. The session
 * layer, cookies, and user table are chain-neutral (User.chain enum).
 *
 * HARD RULE: providers only ever verify *message* signatures. Nothing in the
 * auth layer builds, signs, or sends a transaction, approval, or delegation.
 */
export type ChainId = "SOLANA" | "EVM";

export interface SignInMessageParams {
  domain: string;
  uri: string;
  address: string;
  nonce: string;
  issuedAt: string; // ISO 8601
  expiresAt: string; // ISO 8601
}

export interface ParsedSignInMessage extends SignInMessageParams {
  statement: string;
}

export interface ChainAuthProvider {
  chain: ChainId;
  /** Human-readable label, e.g. "Solana". */
  label: string;
  isValidAddress(address: string): boolean;
  buildMessage(params: SignInMessageParams): string;
  parseMessage(message: string): ParsedSignInMessage | null;
  /**
   * @param signature encoded signature (base58 for Solana, hex for EVM)
   */
  verifySignature(input: { message: string; signature: string; address: string }): boolean;
}

/** Sentence that must appear verbatim in every sign-in message. */
export const NO_SPEND_STATEMENT =
  "This signature does not authorize any transaction or spend any funds.";
