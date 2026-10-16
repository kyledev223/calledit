import { PUMP_CA, PUMP_URL, X_URL } from "@/lib/site";
import { truncateWallet } from "@/lib/format";
import { CopyButton } from "@/components/ui/CopyButton";

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

/** Generic pill capsule, drawn in pixel steps to match the site. */
function PillIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      <g transform="rotate(-45 8 8)">
        <rect x="1" y="5" width="7" height="6" fill="#5fd88a" />
        <rect x="8" y="5" width="7" height="6" fill="#ffffff" />
        <rect x="0" y="6" width="1" height="4" fill="#5fd88a" />
        <rect x="15" y="6" width="1" height="4" fill="#ffffff" />
        <path d="M1 5h14v1H1zM1 10h14v1H1zM0 6h1v4H0zM15 6h1v4h-1z" fill="none" stroke="#000" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

const SOCIALS = [
  { key: "x", label: "X", title: "Follow on X", url: X_URL, Icon: XIcon },
  { key: "pump", label: "pump.fun", title: "Coin on pump.fun", url: PUMP_URL, Icon: PillIcon },
] as const;

/**
 * X and pump.fun buttons. Until a link is configured in src/lib/site.ts, the button
 * renders disabled with a "Coming soon" tooltip instead of linking nowhere.
 */
export function SocialLinks({ variant = "icon", className = "" }: { variant?: "icon" | "label"; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {SOCIALS.map(({ key, label, title, url, Icon }) => {
        const base =
          variant === "icon"
            ? "inline-flex items-center justify-center size-10 border border-line2 bg-card text-fg transition"
            : "inline-flex items-center gap-2 h-9 px-3 border border-line2 bg-card text-fg font-display text-sm transition";
        const inner = (
          <>
            <Icon size={variant === "icon" ? 16 : 14} />
            {variant === "label" && <span>{label}</span>}
          </>
        );
        if (!url) {
          return (
            <span key={key} className={`${base} opacity-40 cursor-not-allowed`} title={`${label}: coming soon`} aria-disabled="true" aria-label={`${label} (coming soon)`}>
              {inner}
            </span>
          );
        }
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            aria-label={title}
            className={`${base} hover:border-pink hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_var(--color-pink)]`}
          >
            {inner}
          </a>
        );
      })}
    </div>
  );
}

/** Contract address with copy button. Renders nothing until PUMP_CA is set. */
export function ContractAddress({ className = "" }: { className?: string }) {
  if (!PUMP_CA) return null;
  return (
    <div className={`inline-flex items-center gap-2 border border-dashed border-line2 bg-card px-3 py-1.5 font-mono text-xs ${className}`}>
      <span className="text-mute">CA</span>
      <span className="text-fg" title={PUMP_CA}>{truncateWallet(PUMP_CA, 6, 6)}</span>
      <CopyButton text={PUMP_CA} label="Copy contract address" />
    </div>
  );
}
