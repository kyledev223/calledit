/**
 * Site identity and social links. Safe to import from client components.
 *
 * To set the links, either fill in the defaults below or set these Vercel
 * environment variables (and redeploy, since NEXT_PUBLIC_ values are baked in at build):
 *   NEXT_PUBLIC_X_URL     full profile URL, e.g. https://x.com/yourhandle
 *   NEXT_PUBLIC_PUMP_CA   the coin's contract address (mint) on pump.fun
 *
 * While a value is empty, its button still shows but is disabled with a "Coming soon" hint.
 */
export const SITE_NAME = "Called";

const DEFAULT_X_URL = "";
const DEFAULT_PUMP_CA = "";

export const X_URL = (process.env.NEXT_PUBLIC_X_URL || DEFAULT_X_URL).trim();
export const PUMP_CA = (process.env.NEXT_PUBLIC_PUMP_CA || DEFAULT_PUMP_CA).trim();
export const PUMP_URL = PUMP_CA ? `https://pump.fun/coin/${PUMP_CA}` : "";
