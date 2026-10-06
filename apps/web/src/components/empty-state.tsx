import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-in flex flex-col items-start px-1 py-10 sm:items-center sm:py-16 sm:text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-[var(--purple)] shadow-[0_8px_24px_rgb(89_65_169_/_0.14)]">
          {icon}
        </div>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--midnight)] sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      {action ? <div className="mt-8 w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}
