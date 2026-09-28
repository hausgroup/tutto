import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Soft pastel tiles from the CosyPOS-inspired language. */
export const COSY_PASTELS = [
  "bg-[#C8E6C9] text-zinc-900 dark:bg-[#5FA88A] dark:text-white",
  "bg-[#E1BEE7] text-zinc-900 dark:bg-[#9B6FB0] dark:text-white",
  "bg-[#BBDEFB] text-zinc-900 dark:bg-[#5B8FBF] dark:text-white",
  "bg-[#F8BBD0] text-zinc-900 dark:bg-[#C975A8] dark:text-white",
  "bg-[#FFE0B2] text-zinc-900 dark:bg-[#C49A6C] dark:text-white",
  "bg-[#D1C4E9] text-zinc-900 dark:bg-[#8B7BB8] dark:text-white",
  "bg-[#B2DFDB] text-zinc-900 dark:bg-[#5A9E98] dark:text-white",
  "bg-[#FFF9C4] text-zinc-900 dark:bg-[#B8A85A] dark:text-white",
] as const;

export const COSY_ACCENT =
  "bg-[#F8BBD0] text-zinc-900 dark:bg-[#C975A8] dark:text-white";

export function cosyPastel(index: number) {
  return COSY_PASTELS[index % COSY_PASTELS.length]!;
}

export function SoftPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] bg-card text-card-foreground ring-1 ring-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SoftStat({
  label,
  value,
  hint,
  index = 0,
  className,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  index?: number;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] flex-col justify-between rounded-[20px] p-4",
        cosyPastel(index),
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium opacity-70">{label}</p>
        {Icon ? <Icon className="size-5 opacity-70" aria-hidden /> : null}
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}
      </div>
    </div>
  );
}

export function SoftSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SoftChip({
  children,
  className,
  active,
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground ring-1 ring-border",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageIntro({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
  );
}
