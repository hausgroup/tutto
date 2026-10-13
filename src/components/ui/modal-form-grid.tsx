import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ROW_COLS: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

/** Vertical stack for modal / dialog forms. Each child is typically a full-width field or a `ModalFormRow`. */
export function ModalForm({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-4", className)}>
      {children}
    </div>
  );
}

/**
 * Equal-width columns inside modals: 2 fields → 50% each, 3 → thirds, etc.
 * Direct children should be fields or `ModalFormField` wrappers (`min-w-0` applied).
 */
export function ModalFormRow({
  cols = 1,
  className,
  children,
}: {
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid w-full min-w-0 gap-4 [&>*]:min-w-0",
        ROW_COLS[cols],
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Label + control cell for shadcn-style modal fields (Arc `Input` brings its own label). */
export function ModalFormField({
  label,
  htmlFor,
  labelClassName,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  labelClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className={
          labelClassName ??
          "text-xs font-normal text-muted-foreground"
        }
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
