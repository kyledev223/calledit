"use client";

import { useEffect } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="card relative w-full max-w-md p-5 sm:p-6 animate-rise">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
          <button type="button" onClick={onClose} className="text-mute hover:text-fg text-xl leading-none -mt-1" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
