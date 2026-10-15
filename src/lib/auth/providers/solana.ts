import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  NO_SPEND_STATEMENT,
  type ChainAuthProvider,
  type ParsedSignInMessage,
  type SignInMessageParams,
} from "../types";

/**
 * Sign-In With Solana (plain-text message, ed25519 signature).
 *
 * Message layout (one field per line; parse + build must stay in sync):
 *
 *   {domain} wants you to sign in with your Solana account:
 *   {address}
 *
 *   {NO_SPEND_STATEMENT}
 *
 *   URI: {uri}
 *   Version: 1
 *   Nonce: {nonce}
 *   Issued At: {issuedAt}
 *   Expiration Time: {expiresAt}
 */
export function buildSolanaMessage(p: SignInMessageParams): string {
  return [
    `${p.domain} wants you to sign in with your Solana account:`,
    p.address,
    "",
    NO_SPEND_STATEMENT,
    "",
    `URI: ${p.uri}`,
    "Version: 1",
    `Nonce: ${p.nonce}`,
    `Issued At: ${p.issuedAt}`,
    `Expiration Time: ${p.expiresAt}`,
  ].join("\n");
}

const HEADER_RE = /^(.+) wants you to sign in with your Solana account:$/;

export function parseSolanaMessage(message: string): ParsedSignInMessage | null {
  const lines = message.split("\n");
  if (lines.length < 10) return null;
  const header = HEADER_RE.exec(lines[0]);
  if (!header) return null;
  const domain = header[1];
  const address = lines[1];
  if (lines[2] !== "") return null;
  const statement = lines[3];
  if (lines[4] !== "") return null;

  const fields: Record<string, string> = {};
  for (const line of lines.slice(5)) {
    const idx = line.indexOf(": ");
    if (idx === -1) return null;
    fields[line.slice(0, idx)] = line.slice(idx + 2);
  }
  const uri = fields["URI"];
  const nonce = fields["Nonce"];
  const issuedAt = fields["Issued At"];
  const expiresAt = fields["Expiration Time"];
  if (!uri || !nonce || !issuedAt || !expiresAt || fields["Version"] !== "1") return null;
  return { domain, address, statement, uri, nonce, issuedAt, expiresAt };
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    const bytes = bs58.decode(address);
    return bytes.length === 32;
  } catch {
    return false;
  }
}

/**
 * Verifies an ed25519 signature over the UTF-8 bytes of `message`.
 * Pure verification only: no RPC, no transaction, no network.
 */
export function verifySolanaSignature(input: {
  message: string;
  signature: string; // base58
  address: string; // base58 public key
}): boolean {
  try {
    const pubkey = bs58.decode(input.address);
    const sig = bs58.decode(input.signature);
    if (pubkey.length !== 32 || sig.length !== 64) return false;
    const msg = new TextEncoder().encode(input.message);
    return nacl.sign.detached.verify(msg, sig, pubkey);
  } catch {
    return false;
  }
}

export const solanaAuthProvider: ChainAuthProvider = {
  chain: "SOLANA",
  label: "Solana",
  isValidAddress: isValidSolanaAddress,
  buildMessage: buildSolanaMessage,
  parseMessage: parseSolanaMessage,
  verifySignature: verifySolanaSignature,
};
