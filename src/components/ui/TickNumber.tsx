"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `value` when it scrolls into view. */
export function TickNumber({
  value,
  duration = 1100,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
  className = "",
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const run = () => {
      if (started.current) return;
      started.current = true;
      if (reduce || value === 0) {
        setDisplay(value);
        return;
      }
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(value * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && run(), { threshold: 0.3 });
    io.observe(el);
    // Safety net: if the observer never fires (print, headless, odd layouts), settle on the value anyway.
    const fallback = setTimeout(() => {
      if (!started.current) {
        started.current = true;
        setDisplay(value);
      }
    }, 2500);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={`font-mono tabular ${className}`}>
      {format(display)}
    </span>
  );
}
