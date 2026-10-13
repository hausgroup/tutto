import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageStatGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border",
        columns === 2 && "lg:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="text-[13px] font-medium leading-none text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-[22px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-none text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
