import { SITE_NAME } from "@/lib/site";

/**
 * Pixel logo mark: a pink tile with notched corners and a black pixel checkmark
 * ("called it"). Drawn on a 12x12 grid; the same cells are used in src/app/icon.svg.
 */
export const CHECK_CELLS: [number, number][] = [
  [8, 3], [9, 3],
  [7, 4], [8, 4],
  [2, 5], [3, 5], [6, 5], [7, 5],
  [3, 6], [4, 6], [5, 6], [6, 6],
  [4, 7], [5, 7],
];

/** Tile outline with 1-cell notches at each corner. */
export const TILE_PATH = "M1 0H11V1H12V11H11V12H1V11H0V1H1Z";

export function LogoMark({ size = 28, shadow = true, className = "" }: { size?: number; shadow?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={shadow ? "0 0 13 13" : "0 0 12 12"}
      shapeRendering="crispEdges"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {shadow && <path d={TILE_PATH} transform="translate(1 1)" fill="var(--color-pink-deep)" />}
      <path d={TILE_PATH} fill="var(--color-pink)" />
      {CHECK_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--color-on-pink)" />
      ))}
    </svg>
  );
}

/** Mark + wordmark, used in the header and footer. */
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display font-bold text-2xl tracking-wide leading-none">{SITE_NAME}</span>
    </span>
  );
}
