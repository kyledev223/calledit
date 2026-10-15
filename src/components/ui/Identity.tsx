import Link from "next/link";
import { displayNameOf, truncateWallet } from "@/lib/format";

function hash(wallet: string): number {
  let h = 2166136261;
  for (let i = 0; i < wallet.length; i++) h = Math.imul(h ^ wallet.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Deterministic accent colour from a wallet address (pink family). */
export function walletHue(wallet: string): string {
  const palette = ["#e6007e", "#ff4fa8", "#c2006b", "#ff7ac0", "#9e0057", "#ff2d95", "#d6339b", "#f2559b"];
  return palette[hash(wallet) % palette.length];
}

/** 5x5 mirrored pixel identicon. */
export function Avatar({ wallet, size = 28 }: { wallet: string; size?: number }) {
  const color = walletHue(wallet);
  let h = hash(wallet + ":px");
  const cells: [number, number][] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (h & 1) {
        cells.push([x, y]);
        if (x < 2) cells.push([4 - x, y]);
      }
      h = h >>> 1 || hash(wallet + y + x);
    }
  }
  return (
    <svg aria-hidden width={size} height={size} viewBox="-1 -1 7 7" shapeRendering="crispEdges" className="shrink-0 bg-lcd border border-line2">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />
      ))}
    </svg>
  );
}

export function Identity({
  user,
  size = "md",
  link = true,
  showWallet = false,
}: {
  user: { wallet: string; displayName: string | null };
  size?: "sm" | "md" | "lg";
  link?: boolean;
  showWallet?: boolean;
}) {
  const name = displayNameOf(user);
  const avatar = size === "lg" ? 40 : size === "sm" ? 20 : 26;
  const text = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";
  const inner = (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Avatar wallet={user.wallet} size={avatar} />
      <span className={`font-semibold truncate ${text} ${user.displayName ? "" : "font-mono font-medium"}`}>{name}</span>
      {showWallet && user.displayName && (
        <span className="font-mono text-xs text-mute hidden sm:inline">{truncateWallet(user.wallet)}</span>
      )}
    </span>
  );
  if (!link) return inner;
  return (
    <Link href={`/u/${user.wallet}`} className="hover:underline underline-offset-2 decoration-line2 min-w-0">
      {inner}
    </Link>
  );
}
