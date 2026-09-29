import type { LucideIcon } from "lucide-react";

const RING = {
  md: { box: "h-12 w-12", icon: "h-6 w-6" },
  lg: { box: "h-16 w-16", icon: "h-8 w-8" },
};

/** The site's icon style: a thin gold line icon inside a thin gold ring (matches the logo and borders). */
export function IconRing({ icon: Icon, size = "md", className = "" }: { icon: LucideIcon; size?: keyof typeof RING; className?: string }) {
  const s = RING[size];
  return (
    <span className={`inline-grid place-items-center rounded-full border border-gold-500/55 text-gold-300 ${s.box} ${className}`} aria-hidden>
      <Icon className={s.icon} strokeWidth={1.5} />
    </span>
  );
}

/** Small inline gold icon placed before a line of text. */
export function InlineIcon({ icon: Icon, className = "" }: { icon: LucideIcon; className?: string }) {
  return <Icon className={`inline-block h-[1.1em] w-[1.1em] shrink-0 text-gold-400 ${className}`} strokeWidth={1.75} aria-hidden />;
}
