/**
 * Browser-side sign-in flow.
 *
 * HARD RULE. READ BEFORE EDITING:
 * The only wallet method this app ever calls is `signMessage`.
 * We never call signTransaction, signAllTransactions, sendTransaction,
 * signAndSendTransaction, or request any approval/delegation. Signing in is
 * free and cannot move funds. tests/no-transaction.test.ts enforces this by
 * (a) running this flow against a spy wallet and (b) scanning src/ for the
 * forbidden method names.
 */
import bs58 from "bs58";

export interface MessageSigner {
  /** base58 address */
  address: string;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

export type Fetcher = typeof fetch;

export interface SignInResult {
  user: {
    id: string;
    wallet: string;
    displayName: string | null;
    isAdmin: boolean;
    isNew: boolean;
  };
}

export async function signInWithWallet(
  signer: MessageSigner,
  fetcher: Fetcher = fetch,
  chain: "SOLANA" | "EVM" = "SOLANA",
): Promise<SignInResult> {
  const nonceRes = await fetcher("/api/auth/nonce", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: signer.address, chain }),
  });
  if (!nonceRes.ok) throw new Error((await safeJson(nonceRes))?.error ?? "Could not start sign-in");
  const { message } = (await nonceRes.json()) as { message: string };

  // The ONLY wallet interaction: sign a plain-text message.
  const signatureBytes = await signer.signMessage(new TextEncoder().encode(message));
  const signature = bs58.encode(signatureBytes);

  const verifyRes = await fetcher("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address: signer.address, chain, message, signature }),
  });
  if (!verifyRes.ok) throw new Error((await safeJson(verifyRes))?.error ?? "Signature rejected");
  return (await verifyRes.json()) as SignInResult;
}

async function safeJson(res: Response): Promise<{ error?: string } | null> {
  try {
    return (await res.json()) as { error?: string };
  } catch {
    return null;
  }
}
