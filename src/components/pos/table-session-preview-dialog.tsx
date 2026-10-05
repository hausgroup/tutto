"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/arc/button/button";
import type { TableSessionSendBatch } from "@/lib/orders/bill-segments";
import type { OrderItem } from "@/lib/orders/types";
import { formatCurrency } from "@/lib/utils/money";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatSentAt(iso: string | null) {
  if (!iso) return "Envío anterior";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function lineLabel(item: OrderItem) {
  return item.productName;
}

export function TableSessionPreviewDialog({
  open,
  onOpenChange,
  batches,
  totalMinor,
  canReprintTickets = false,
  reprintDisabled = false,
  reprintLoading = false,
  onReprintTickets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batches: TableSessionSendBatch[];
  totalMinor: number;
  canReprintTickets?: boolean;
  reprintDisabled?: boolean;
  reprintLoading?: boolean;
  onReprintTickets?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>Cuenta de la mesa</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Pedidos enviados a cocina o bar, pendientes de cobro.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {batches.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Aún no hay pedidos enviados en esta mesa.
            </p>
          ) : (
            <ul className="space-y-3">
              {batches.map((batch) => (
                <li
                  key={batch.sentAt ?? "legacy"}
                  className="rounded-2xl border border-border bg-muted/25 p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatSentAt(batch.sentAt)}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {batch.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="font-medium tabular-nums">
                            {item.quantity}×
                          </span>{" "}
                          {lineLabel(item)}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatCurrency(item.lineTotalMinor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex justify-end text-sm font-medium tabular-nums">
                    {formatCurrency(batch.totalMinor)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border px-5 py-4">
          <div className="flex items-end justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Total sin cobrar
            </span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(totalMinor)}
            </span>
          </div>
          {canReprintTickets && onReprintTickets ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              disabled={reprintDisabled}
              loading={reprintLoading}
              onClick={onReprintTickets}
            >
              <Printer className="size-4" aria-hidden />
              Reimprimir tickets
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
