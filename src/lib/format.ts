export function truncateWallet(wallet: string, head = 4, tail = 4): string {
  if (wallet.length <= head + tail + 1) return wallet;
  return `${wallet.slice(0, head)}…${wallet.slice(-tail)}`;
}

export function displayNameOf(u: { displayName: string | null; wallet: string }): string {
  return u.displayName?.trim() || truncateWallet(u.wallet);
}

/** Price formatting that adapts to magnitude (memecoins need many decimals). */
export function formatPrice(value: number | string | null | undefined, decimalsHint?: number): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  let decimals = decimalsHint ?? 2;
  if (decimalsHint == null) {
    if (n >= 1000) decimals = 2;
    else if (n >= 1) decimals = 2;
    else if (n >= 0.01) decimals = 4;
    else if (n >= 0.0001) decimals = 6;
    else decimals = 8;
  }
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatUsd(value: number | string | null | undefined, decimalsHint?: number): string {
  const s = formatPrice(value, decimalsHint);
  return s === "—" ? s : `$${s}`;
}

/** "$112.4k", "$1.98M", "$0.82" for tight spaces. */
export function formatCompactUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}k`;
  return formatUsd(n);
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatInt(n: number): string {
  return n.toLocaleString("en-US");
}

/** "2d 04h", "3h 12m", "12m 05s", "00s" */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "expired";
  const s = Math.floor(msRemaining / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h`;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(sec)}s`;
  return `${pad(sec)}s`;
}

export function formatRelative(date: Date | string, now = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - d.getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const units: [number, string][] = [
    [60_000, "s"],
    [3_600_000, "m"],
    [86_400_000, "h"],
    [7 * 86_400_000, "d"],
    [30 * 86_400_000, "w"],
    [365 * 86_400_000, "mo"],
  ];
  let value = Math.floor(abs / 1000);
  let unit = "s";
  let prev = 1000;
  for (const [ms, u] of units) {
    if (abs < ms) break;
    prev = ms;
    unit = u;
  }
  value = Math.floor(abs / prev);
  if (unit === "s" && value < 10) return future ? "in a moment" : "just now";
  return future ? `in ${value}${unit}` : `${value}${unit} ago`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** "Oct 17, 5:55 PM" — for the call sentence, where the timezone would just add noise. */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function solscanTx(sig: string): string {
  return `https://solscan.io/tx/${sig}`;
}

export function solscanAccount(address: string): string {
  return `https://solscan.io/account/${address}`;
}
