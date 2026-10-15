import type { CallStatus } from "@prisma/client";

export const STATUS_LABEL: Record<CallStatus, string> = {
  LIVE: "Live",
  PLAYED_OUT: "Played out",
  MISSED: "Missed",
  DELETED: "Deleted",
};

export function StatusChip({ status, className = "" }: { status: CallStatus; className?: string }) {
  const cls =
    status === "LIVE" ? "status-live" : status === "PLAYED_OUT" ? "status-played" : "status-missed";
  return (
    <span className={`chip ${cls} ${className}`}>
      {status === "LIVE" && <span className="size-1.5 bg-pink animate-pulse-dot" aria-hidden />}
      {status === "PLAYED_OUT" && <span aria-hidden>✓</span>}
      {STATUS_LABEL[status]}
    </span>
  );
}
