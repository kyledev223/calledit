import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  buildSolanaMessage,
  isValidSolanaAddress,
  parseSolanaMessage,
  verifySolanaSignature,
} from "@/lib/auth/providers/solana";
import { NO_SPEND_STATEMENT } from "@/lib/auth/types";

function keypair() {
  const kp = nacl.sign.keyPair();
  return { kp, address: bs58.encode(kp.publicKey) };
}

function sign(message: string, secretKey: Uint8Array) {
  return bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), secretKey));
}

const params = (address: string) => ({
  domain: "receipts.test",
  uri: "https://receipts.test",
  address,
  nonce: "abc123def456",
  issuedAt: "2026-10-15T12:00:00.000Z",
  expiresAt: "2026-10-15T12:10:00.000Z",
});

describe("Sign-In With Solana message", () => {
  it("includes the no-spend statement verbatim", () => {
    const { address } = keypair();
    const msg = buildSolanaMessage(params(address));
    expect(msg).toContain(NO_SPEND_STATEMENT);
    expect(msg).toContain("This signature does not authorize any transaction or spend any funds.");
  });

  it("round-trips through parse", () => {
    const { address } = keypair();
    const p = params(address);
    const parsed = parseSolanaMessage(buildSolanaMessage(p));
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({ ...p, statement: NO_SPEND_STATEMENT });
  });

  it("rejects a malformed message", () => {
    expect(parseSolanaMessage("hello")).toBeNull();
    expect(parseSolanaMessage("")).toBeNull();
  });

  it("surfaces a tampered statement so the server can reject it", () => {
    const { address } = keypair();
    const msg = buildSolanaMessage(params(address)).replace(NO_SPEND_STATEMENT, "Approve all transfers.");
    const parsed = parseSolanaMessage(msg);
    expect(parsed?.statement).not.toBe(NO_SPEND_STATEMENT);
  });
});

describe("verifySolanaSignature", () => {
  it("accepts a valid signature from the matching key", () => {
    const { kp, address } = keypair();
    const message = buildSolanaMessage(params(address));
    const signature = sign(message, kp.secretKey);
    expect(verifySolanaSignature({ message, signature, address })).toBe(true);
  });

  it("rejects a signature over a different message", () => {
    const { kp, address } = keypair();
    const message = buildSolanaMessage(params(address));
    const signature = sign(message + " ", kp.secretKey);
    expect(verifySolanaSignature({ message, signature, address })).toBe(false);
  });

  it("rejects a signature from a different key", () => {
    const { address } = keypair();
    const other = keypair();
    const message = buildSolanaMessage(params(address));
    const signature = sign(message, other.kp.secretKey);
    expect(verifySolanaSignature({ message, signature, address })).toBe(false);
  });

  it("rejects garbage input without throwing", () => {
    expect(verifySolanaSignature({ message: "x", signature: "not-base58!!", address: "nope" })).toBe(false);
    expect(verifySolanaSignature({ message: "x", signature: bs58.encode(new Uint8Array(10)), address: keypair().address })).toBe(false);
  });
});

describe("isValidSolanaAddress", () => {
  it("accepts 32-byte base58 keys and rejects others", () => {
    expect(isValidSolanaAddress(keypair().address)).toBe(true);
    expect(isValidSolanaAddress("0xabc")).toBe(false);
    expect(isValidSolanaAddress(bs58.encode(new Uint8Array(20)))).toBe(false);
  });
});
