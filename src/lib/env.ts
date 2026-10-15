export const env = {
  appDomain: process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost:3000",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-insecure-secret",
  cronSecret: process.env.CRON_SECRET ?? "",
  adminWallets: (process.env.ADMIN_WALLETS ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean),
  coingeckoKey: process.env.COINGECKO_API_KEY ?? "",
  coingeckoPro: process.env.COINGECKO_PRO === "1",
};

export function isAdminWallet(wallet: string | null | undefined): boolean {
  if (!wallet) return false;
  return env.adminWallets.includes(wallet);
}
