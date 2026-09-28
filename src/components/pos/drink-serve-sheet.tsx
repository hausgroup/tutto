"use client";

import { Clock, Zap } from "lucide-react";
import type { Product } from "@/lib/catalog/types";
import {
  DRINK_SERVE_LABELS,
  type DrinkServeTiming,
} from "@/lib/orders/drink-serve";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

export function DrinkServeSheet({
  product,
  open,
  onOpenChange,
  onChoose,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (timing: DrinkServeTiming) => void;
}) {
  if (!product) return null;

  const options: {
    timing: DrinkServeTiming;
    icon: typeof Zap;
    accent: string;
  }[] = [
    {
      timing: "immediate",
      icon: Zap,
      accent:
        "bg-[#BBDEFB]/80 ring-[#5B8FBF]/30 hover:bg-[#BBDEFB] dark:bg-[#5B8FBF]/25 dark:ring-[#5B8FBF]/40",
    },
    {
      timing: "with_meal",
      icon: Clock,
      accent:
        "bg-[#FFE0B2]/80 ring-[#C49A6C]/30 hover:bg-[#FFE0B2] dark:bg-[#C49A6C]/25 dark:ring-[#C49A6C]/40",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-[24px] border-0 px-4 pb-8 pt-3"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" aria-hidden />
        <SheetHeader className="px-1 pb-2 text-left">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {product.name}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {formatCurrency(product.priceMinor)} · ¿Cuándo lo servimos?
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 px-1 pt-2">
          {options.map(({ timing, icon: Icon, accent }) => {
            const meta = DRINK_SERVE_LABELS[timing];
            return (
              <button
                key={timing}
                type="button"
                onClick={() => {
                  onChoose(timing);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex min-h-[112px] flex-col items-start justify-between rounded-[20px] p-4 text-left ring-1 transition-transform active:scale-[0.98]",
                  accent,
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-white/60 dark:bg-black/20">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-base font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                    {meta.title}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-zinc-700/80 dark:text-zinc-200/80">
                    {meta.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
