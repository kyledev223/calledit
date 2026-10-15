import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminOverview } from "@/lib/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Eyebrow, Heading } from "@/components/ui/Section";
import { ConnectButton, Reassurance } from "@/components/wallet/ConnectButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

/**
 * Gated by ADMIN_WALLETS: the same signed-message login, but only allowlisted
 * wallets get past this page. Every /api/admin/* route re-checks requireAdmin().
 */
export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) {
    return (
      <Gate title="Admin" lead="Sign in with an" accent="admin wallet.">
        <ConnectButton />
        <Reassurance />
      </Gate>
    );
  }
  if (!me.isAdmin) {
    return (
      <Gate title="Admin" lead="This wallet isn't" accent="on the list.">
        <p className="text-sm text-fg2">Admins are configured with the ADMIN_WALLETS environment variable.</p>
      </Gate>
    );
  }
  const overview = await getAdminOverview();
  return <AdminDashboard initial={overview} adminWallet={me.wallet} />;
}

function Gate({ title, lead, accent, children }: { title: string; lead: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20 text-center">
      <Eyebrow className="mb-4">{title}</Eyebrow>
      <Heading lead={lead} accent={accent} />
      <div className="mt-8 flex flex-col items-center gap-3">{children}</div>
    </div>
  );
}
