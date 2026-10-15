import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Eyebrow, Heading } from "@/components/ui/Section";
import { ConnectButton, Reassurance } from "@/components/wallet/ConnectButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You" };

export default async function YouPage() {
  const me = await getCurrentUser();
  if (me) redirect(`/u/${me.wallet}`);
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
      <Eyebrow className="mb-4">Your profile</Eyebrow>
      <Heading lead="Connect to see" accent="your receipts." />
      <p className="mt-4 text-fg2">Your wallet is your account. There is no email and no password, just one signed message.</p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <ConnectButton />
        <Reassurance />
      </div>
    </div>
  );
}
