"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CloudUpload } from "lucide-react";
import {
  enqueueSelectedSiigoSalesAction,
  listSiigoSalesAction,
  type SiigoSaleCandidate,
} from "@/lib/reports/actions";
import { calendarDateInBogota } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function statusLabel(status: SiigoSaleCandidate["siigoStatus"]) {
  switch (status) {
    case "synced":
      return "Enviado";
    case "pending":
      return "En cola";
    case "failed":
      return "Falló";
    default:
      return "Pendiente";
  }
}

export function SiigoSendDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sales, setSales] = useState<SiigoSaleCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void listSiigoSalesAction()
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) {
          toast.error(result.error);
          setSales([]);
          return;
        }
        setSales(result.sales);
        setSelected(
          new Set(
            result.sales
              .filter((sale) => sale.siigoStatus === "not_queued")
              .map((sale) => sale.orderId),
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectable = useMemo(
    () => sales.filter((sale) => sale.siigoStatus !== "synced"),
    [sales],
  );

  const allSelectableChecked =
    selectable.length > 0 &&
    selectable.every((sale) => selected.has(sale.orderId));

  function toggle(orderId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function toggleAll() {
    if (allSelectableChecked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectable.map((sale) => sale.orderId)));
  }

  function sendSelected() {
    const orderIds = [...selected];
    if (orderIds.length === 0) {
      toast.error("Selecciona al menos una venta.");
      return;
    }
    startTransition(async () => {
      const result = await enqueueSelectedSiigoSalesAction({ orderIds });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.queued === 1
          ? "1 venta encolada para Siigo"
          : `${result.queued} ventas encoladas para Siigo`,
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex! h-[min(88dvh,40rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-0! overflow-hidden rounded-[20px] p-0! sm:max-w-2xl",
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-5 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Enviar a Siigo
          </DialogTitle>
          <DialogDescription>
            Selecciona las ventas a sincronizar. Las ya enviadas no se pueden
            volver a marcar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3">
          <button
            type="button"
            onClick={toggleAll}
            disabled={loading || selectable.length === 0}
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            {allSelectableChecked ? "Quitar selección" : "Seleccionar todas"}
          </button>
          <p className="text-sm tabular-nums text-muted-foreground">
            {selected.size} seleccionada{selected.size === 1 ? "" : "s"}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <div className="flex h-full min-h-40 items-center justify-center rounded-[20px] bg-muted/50 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                No hay ventas completadas para enviar.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sales.map((sale) => {
                const locked = sale.siigoStatus === "synced";
                const checked = selected.has(sale.orderId);
                return (
                  <li key={sale.orderId}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => toggle(sale.orderId)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors",
                        locked && "cursor-default bg-muted/60 opacity-70",
                        !locked &&
                          checked &&
                          "bg-[#C8E6C9] text-zinc-900 dark:bg-[#5FA88A] dark:text-white",
                        !locked &&
                          !checked &&
                          "bg-background ring-1 ring-border hover:bg-muted/70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                          locked && "bg-muted text-muted-foreground",
                          !locked &&
                            checked &&
                            "bg-foreground text-background",
                          !locked &&
                            !checked &&
                            "bg-muted text-transparent ring-1 ring-border",
                        )}
                        aria-hidden
                      >
                        {locked || checked ? "✓" : ""}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          Pedido #{sale.orderNumber}
                          {sale.tableLabel ? ` · Mesa ${sale.tableLabel}` : ""}
                        </p>
                        <p
                          className={cn(
                            "truncate text-xs",
                            checked && !locked
                              ? "opacity-70"
                              : "text-muted-foreground",
                          )}
                        >
                          {calendarDateInBogota(sale.closedAt)}
                          {sale.paymentMethod
                            ? ` · ${sale.paymentMethod}`
                            : ""}{" "}
                          · {statusLabel(sale.siigoStatus)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatCurrency(sale.totalMinor)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={sendSelected}
            disabled={pending || loading || selected.size === 0}
          >
            <CloudUpload className="size-4" />
            {pending
              ? "Encolando…"
              : selected.size > 0
                ? `Enviar ${selected.size} a Siigo`
                : "Enviar a Siigo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
