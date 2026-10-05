"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  Minus,
  Plus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  getOrderCheckoutAction,
  payOrderAction,
} from "@/lib/orders/actions";
import type { TableSessionSendBatch } from "@/lib/orders/bill-segments";
import { filterUnpaidSentItems } from "@/lib/orders/bill-segments";
import type { Order, OrderItem } from "@/lib/orders/types";
import {
  cycleGuestAssignment,
  defaultGuests,
  totalsByGuest,
  type GuestSlot,
} from "@/lib/orders/split-bill";
import { formatCurrency } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS: {
  id: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}[] = [
  {
    id: "cash",
    label: "Efectivo",
    icon: Banknote,
    hint: "Registra el pago en efectivo y cierra cuando corresponda.",
  },
  {
    id: "card",
    label: "Tarjeta",
    icon: CreditCard,
    hint: "Datáfono o tarjeta; confirma cuando el cobro fue exitoso.",
  },
  {
    id: "transfer",
    label: "Transferencia",
    icon: Wallet,
    hint: "Nequi, PSE u otra transferencia verificada.",
  },
];

const GUEST_ACCENTS = [
  "bg-sky-500/15 text-sky-800 ring-sky-500/30 dark:text-sky-200",
  "bg-violet-500/15 text-violet-800 ring-violet-500/30 dark:text-violet-200",
  "bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:text-amber-200",
  "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-200",
  "bg-rose-500/15 text-rose-800 ring-rose-500/30 dark:text-rose-200",
  "bg-cyan-500/15 text-cyan-800 ring-cyan-500/30 dark:text-cyan-200",
];

function formatSentAt(iso: string | null) {
  if (!iso) return "Envío anterior";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

type PayTarget = {
  mode: "full" | "guest";
  amountMinor: number;
  label: string;
  guest?: GuestSlot;
};

export function PosCheckoutDialog({
  open,
  onOpenChange,
  order,
  tableLabel,
  batches,
  billSubtotalMinor,
  billTaxMinor,
  billTotalMinor,
  onOrderUpdated,
  onOrderCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  tableLabel: string;
  batches: TableSessionSendBatch[];
  billSubtotalMinor: number;
  billTaxMinor: number;
  billTotalMinor: number;
  onOrderUpdated: (order: Order) => void;
  onOrderCompleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [checkoutTab, setCheckoutTab] = useState<"full" | "split">("full");
  const [guestCount, setGuestCount] = useState(2);
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [paidMinor, setPaidMinor] = useState(0);
  const [remainingMinor, setRemainingMinor] = useState(billTotalMinor);

  const unpaidItems = useMemo(
    () => filterUnpaidSentItems(order.items),
    [order.items],
  );

  const guests = useMemo(() => defaultGuests(guestCount), [guestCount]);
  const guestTotals = useMemo(
    () => totalsByGuest(unpaidItems, guests, assignment),
    [unpaidItems, guests, assignment],
  );

  const guestIndexById = useMemo(() => {
    const map = new Map<string, number>();
    guests.forEach((g, i) => map.set(g.id, i));
    return map;
  }, [guests]);

  function refreshCheckoutSummary() {
    startTransition(async () => {
      const result = await getOrderCheckoutAction(order.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPaidMinor(result.paidMinor ?? 0);
      setRemainingMinor(
        result.remainingMinor ?? Math.max(0, billTotalMinor - (result.paidMinor ?? 0)),
      );
    });
  }

  useEffect(() => {
    if (!open) {
      setPayTarget(null);
      setCheckoutTab("full");
      return;
    }
    setRemainingMinor(billTotalMinor);
    refreshCheckoutSummary();
  }, [open, order.id, billTotalMinor]);

  function guestLabelForItem(item: OrderItem) {
    const guestId =
      assignment[item.id] ?? guests[0]?.id;
    const index = guestId ? guestIndexById.get(guestId) ?? 0 : 0;
    return { guestId, index, label: guests[index]?.label ?? "Persona 1" };
  }

  function cycleItemGuest(item: OrderItem) {
    const current = assignment[item.id] ?? guests[0]?.id;
    const next = cycleGuestAssignment(guests, current);
    setAssignment((prev) => ({ ...prev, [item.id]: next }));
  }

  function registerPayment(methodCode: string) {
    if (!payTarget || payTarget.amountMinor <= 0) return;
    startTransition(async () => {
      const result = await payOrderAction({
        orderId: order.id,
        methodCode,
        amountMinor: payTarget.amountMinor,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.order) onOrderUpdated(result.order);
      const remaining = result.remainingMinor ?? 0;
      setPaidMinor(billTotalMinor - remaining);
      setRemainingMinor(remaining);
      setPayTarget(null);
      toast.success(
        result.orderCompleted
          ? "Cuenta cerrada"
          : `Pago registrado · faltan ${formatCurrency(remaining)}`,
      );
      if (result.orderCompleted) {
        onOrderCompleted();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Cobrar · {tableLabel}</DialogTitle>
          {paidMinor > 0 ? (
            <p className="text-sm text-muted-foreground">
              Pagado{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCurrency(paidMinor)}
              </span>
              {" · "}
              Falta{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCurrency(remainingMinor)}
              </span>
            </p>
          ) : null}
        </DialogHeader>

        {payTarget ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
            <p className="text-sm text-muted-foreground">Método de pago</p>
            <p className="mt-1 text-lg font-semibold">{payTarget.label}</p>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">
              {formatCurrency(payTarget.amountMinor)}
            </p>
            <ul className="mt-6 space-y-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <li key={method.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => registerPayment(method.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/80 disabled:opacity-50"
                    >
                      <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {method.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {method.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button
              type="button"
              variant="ghost"
              className="mt-4"
              disabled={pending}
              onClick={() => setPayTarget(null)}
            >
              Volver
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 border-b border-border px-5 py-3">
              <button
                type="button"
                onClick={() => setCheckoutTab("full")}
                className={cn(
                  "flex-1 rounded-xl py-2 text-sm font-medium transition-colors",
                  checkoutTab === "full"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground",
                )}
              >
                Cuenta completa
              </button>
              <button
                type="button"
                onClick={() => setCheckoutTab("split")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-colors",
                  checkoutTab === "split"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Users className="size-4" aria-hidden />
                Dividir
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatCurrency(billSubtotalMinor)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Impuestos</span>
                  <span className="tabular-nums">
                    {formatCurrency(billTaxMinor)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <span>Total cuenta</span>
                  <span className="tabular-nums">
                    {formatCurrency(billTotalMinor)}
                  </span>
                </div>
              </div>

              {batches.map((batch) => (
                <section
                  key={batch.sentAt ?? "legacy"}
                  className="rounded-xl border border-border bg-muted/20 p-3"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatSentAt(batch.sentAt)}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {batch.items.map((item) => {
                      const guest = guestLabelForItem(item);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            disabled={checkoutTab !== "split"}
                            onClick={() => cycleItemGuest(item)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left text-sm",
                              checkoutTab === "split" &&
                                "hover:bg-muted/60 active:bg-muted",
                            )}
                          >
                            <span className="min-w-0">
                              <span className="tabular-nums">{item.quantity}×</span>{" "}
                              {item.productName}
                              {checkoutTab === "split" ? (
                                <span
                                  className={cn(
                                    "ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                                    GUEST_ACCENTS[
                                      guest.index % GUEST_ACCENTS.length
                                    ],
                                  )}
                                >
                                  {guest.label}
                                </span>
                              ) : null}
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {formatCurrency(item.lineTotalMinor)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              {checkoutTab === "split" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Personas en la mesa</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Menos personas"
                        disabled={guestCount <= 2}
                        onClick={() => setGuestCount((n) => Math.max(2, n - 1))}
                        className="flex size-8 items-center justify-center rounded-full bg-muted disabled:opacity-40"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                        {guestCount}
                      </span>
                      <button
                        type="button"
                        aria-label="Más personas"
                        disabled={guestCount >= 6}
                        onClick={() => setGuestCount((n) => Math.min(6, n + 1))}
                        className="flex size-8 items-center justify-center rounded-full bg-muted disabled:opacity-40"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Toca cada producto para cambiar a quién se cobra. Luego cobra
                    por persona; la mesa se cierra cuando el total esté pagado.
                  </p>
                  <ul className="space-y-2">
                    {guestTotals.map(({ guest, items, totalMinor }, index) => (
                      <li
                        key={guest.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
                              GUEST_ACCENTS[index % GUEST_ACCENTS.length],
                            )}
                          >
                            {guest.label}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {items.length === 0
                              ? "Sin productos asignados"
                              : `${items.length} línea${items.length === 1 ? "" : "s"}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(totalMinor)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending || totalMinor <= 0}
                            onClick={() =>
                              setPayTarget({
                                mode: "guest",
                                guest,
                                amountMinor: totalMinor,
                                label: guest.label,
                              })
                            }
                          >
                            Cobrar
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="-mx-0 border-t border-border px-5 py-4">
              <Button
                type="button"
                className="h-12 w-full rounded-2xl text-base font-semibold"
                disabled={pending || remainingMinor <= 0}
                onClick={() =>
                  setPayTarget({
                    mode: "full",
                    amountMinor: remainingMinor,
                    label: "Cuenta completa",
                  })
                }
              >
                {paidMinor > 0
                  ? `Cobrar restante ${formatCurrency(remainingMinor)}`
                  : `Cobrar ${formatCurrency(remainingMinor)}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
