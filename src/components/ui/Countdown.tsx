"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/format";

export function Countdown({ to, className = "" }: { to: string | Date; className?: string }) {
  const target = typeof to === "string" ? new Date(to).getTime() : to.getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = now == null ? null : target - now;
  const urgent = remaining != null && remaining > 0 && remaining < 60 * 60 * 1000;

  return (
    <span
      suppressHydrationWarning
      className={`font-mono tabular ${urgent ? "text-pink" : ""} ${className}`}
      title={new Date(target).toLocaleString()}
    >
      {remaining == null ? "…" : formatCountdown(remaining)}
    </span>
  );
}
