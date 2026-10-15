import type { ReactNode } from "react";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

/** Two-part pixel headline: plain lead + pink accent (uppercase, see .headline). */
export function Heading({
  lead,
  accent,
  as: Tag = "h2",
  size = "lg",
  className = "",
}: {
  lead: string;
  accent?: string;
  as?: "h1" | "h2" | "h3";
  size?: "xl" | "lg" | "md";
  className?: string;
}) {
  const sizes = {
    xl: "text-[clamp(40px,5.6vw,84px)] leading-[0.94]",
    lg: "text-[clamp(34px,5vw,66px)] leading-[0.98]",
    md: "text-[clamp(26px,3vw,36px)] leading-none",
  }[size];
  return (
    <Tag className={`headline text-fg ${sizes} ${className}`}>
      {lead}{" "}
      {accent && <em>{accent}</em>}
    </Tag>
  );
}

export function Section({
  id,
  eyebrow,
  lead,
  accent,
  copy,
  children,
  className = "",
  tone = "plain",
}: {
  id?: string;
  eyebrow: string;
  lead: string;
  accent?: string;
  copy?: ReactNode;
  children?: ReactNode;
  className?: string;
  tone?: "plain" | "deep";
}) {
  return (
    <section id={id} className={`${tone === "deep" ? "bg-bg2/70" : ""} border-t border-line ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
          <Heading lead={lead} accent={accent} />
          {copy && <div className="mt-5 text-base sm:text-lg text-fg2 leading-relaxed">{copy}</div>}
        </div>
        {children && <div className="mt-10 sm:mt-14">{children}</div>}
      </div>
    </section>
  );
}
