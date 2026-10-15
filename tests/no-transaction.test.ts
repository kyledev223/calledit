/**
 * HARD RULE: the app only ever calls `signMessage`. It must never ask a wallet
 * to sign or send a transaction, approve a token, or delegate anything.
 *
 * Two layers of enforcement:
 *  1. Behavioural: run the real sign-in flow against a spy wallet that exposes
 *     every dangerous method and assert none were touched.
 *  2. Static: scan src/ for calls to transaction-signing APIs.
 */
import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { signInWithWallet } from "@/lib/auth/client";

describe("sign-in flow never touches transaction APIs", () => {
  it("calls signMessage exactly once and nothing else", async () => {
    const kp = nacl.sign.keyPair();
    const address = bs58.encode(kp.publicKey);

    const spyWallet = {
      address,
      signMessage: vi.fn(async (bytes: Uint8Array) => nacl.sign.detached(bytes, kp.secretKey)),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      sendTransaction: vi.fn(),
      signAndSendTransaction: vi.fn(),
      approve: vi.fn(),
      delegate: vi.fn(),
    };

    const fetchSpy = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/api/auth/nonce")) {
        return new Response(JSON.stringify({ message: `receipts.test wants you to sign in with your Solana account:\n${address}\n\nThis signature does not authorize any transaction or spend any funds.\n\nURI: https://receipts.test\nVersion: 1\nNonce: n\nIssued At: x\nExpiration Time: y` }), { status: 200 });
      }
      if (u.endsWith("/api/auth/verify")) {
        const body = JSON.parse(String(init?.body)) as { signature: string; message: string };
        const ok = nacl.sign.detached.verify(new TextEncoder().encode(body.message), bs58.decode(body.signature), kp.publicKey);
        return new Response(JSON.stringify({ user: { id: "u1", wallet: address, displayName: null, isAdmin: false, isNew: true }, ok }), { status: ok ? 200 : 401 });
      }
      throw new Error(`unexpected fetch ${u}`);
    });
    const fetcher = fetchSpy as unknown as typeof fetch;

    const result = await signInWithWallet(spyWallet, fetcher);
    expect(result.user.wallet).toBe(address);

    expect(spyWallet.signMessage).toHaveBeenCalledTimes(1);
    expect(spyWallet.signTransaction).not.toHaveBeenCalled();
    expect(spyWallet.signAllTransactions).not.toHaveBeenCalled();
    expect(spyWallet.sendTransaction).not.toHaveBeenCalled();
    expect(spyWallet.signAndSendTransaction).not.toHaveBeenCalled();
    expect(spyWallet.approve).not.toHaveBeenCalled();
    expect(spyWallet.delegate).not.toHaveBeenCalled();

    // Only the two auth endpoints are hit; no RPC, no chain.
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls).toEqual(["/api/auth/nonce", "/api/auth/verify"]);
  });
});

describe("source tree contains no transaction-signing calls", () => {
  const FORBIDDEN = [
    /\.signTransaction\s*\(/,
    /\.signAllTransactions\s*\(/,
    /\.sendTransaction\s*\(/,
    /signAndSendTransaction\s*\(/,
    /sendRawTransaction\s*\(/,
    /sendAndConfirmTransaction\s*\(/,
    /new\s+(Versioned)?Transaction\s*\(/,
    /TransactionInstruction/,
    /createApproveInstruction|createTransferInstruction|SystemProgram\.transfer/,
    /useAnchorWallet/,
  ];

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  }

  it("no src file invokes a transaction API", () => {
    const root = path.resolve(__dirname, "..", "src");
    const offenders: string[] = [];
    for (const file of walk(root)) {
      const text = readFileSync(file, "utf8");
      for (const re of FORBIDDEN) {
        if (re.test(text)) offenders.push(`${path.relative(root, file)} matches ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the sign-in client declares the rule in a comment", () => {
    const text = readFileSync(path.resolve(__dirname, "..", "src/lib/auth/client.ts"), "utf8");
    expect(text).toMatch(/HARD RULE/);
    expect(text).toMatch(/only wallet method this app ever calls is `signMessage`/);
  });
});
