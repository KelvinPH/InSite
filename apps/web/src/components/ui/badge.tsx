import { cn } from "@/lib/utils";

const tones = {
  ok: "bg-emerald-100/80 text-emerald-900",
  warn: "bg-amber-100/80 text-amber-950",
  danger: "bg-red-100/80 text-red-900",
  neutral: "bg-[var(--surface)] text-[var(--charcoal)]",
  accent: "bg-[var(--veil)] text-[var(--purple)]",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
