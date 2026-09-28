"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  Coffee,
  CreditCard,
  CupSoda,
  IceCream,
  Minus,
  Plus,
  Printer,
  Search,
  Soup,
  Trash2,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CatalogSnapshot, Product } from "@/lib/catalog/types";
import type { DrinkServeTiming, Order, OrderItem } from "@/lib/orders/types";
import type { TableReservation } from "@/lib/floor/types";
import {
  adjustOrderProductQuantityAction,
  moveBarDrinkUnitToWithMealAction,
  payOrderAction,
  sendOrderAction,
} from "@/lib/orders/actions";
import { printStationTicketsAction } from "@/lib/printing/actions";
import { printStationTicketPdfs } from "@/lib/printing/browser-print";
import {
  applyOptimisticMoveBarUnitToWithMeal,
  applyOptimisticQuantityDelta,
  mergeServerOrderItems,
} from "@/lib/orders/optimistic";
import { orderHasPendingBarDrinks } from "@/lib/orders/bar-delivery";
import {
  canMoveBarUnitToWithMeal,
  canRemoveLineFromPosTicket,
  catalogProductIsPosBarDrink,
  isWithMealBarLine,
  orderItemServeHint,
} from "@/lib/orders/drink-serve";
import { consolidateWithMealOrderLines } from "@/lib/orders/consolidate-lines";
import { DrinkServeSheet } from "@/components/pos/drink-serve-sheet";
import { PosTableHeaderMenu } from "@/components/pos/pos-table-header-menu";
import { calculateLineItem } from "@/lib/orders/calculate";
import {
  clearCachedPosBoot,
  setCachedPosOrder,
} from "@/lib/pos/client-cache";
import {
  patchCachedFloorBillTotal,
  patchCachedFloorPendingBarDrinks,
  patchCachedFloorTableStatus,
  warmFloorBoot,
} from "@/lib/floor/client-cache";
import { formatCurrency } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

// #region agent log
function posDebugLog(
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
) {
  fetch("http://127.0.0.1:7657/ingest/9c21ec7a-f83c-47b2-a116-b9a5d72f1fd1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "af00c9",
    },
    body: JSON.stringify({
      sessionId: "af00c9",
      location: "mobile-pos-view.tsx",
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {});
}
// #endregion

function totalProductQty(order: Order, productId: string): number {
  let sum = 0;
  for (const item of order.items) {
    if (item.productId !== productId || item.status === "cancelled") continue;
    sum += item.quantity;
  }
  return sum;
}

const CATEGORY_PASTELS = [
  "bg-[#C8E6C9] text-zinc-900 dark:bg-[#5FA88A] dark:text-white",
  "bg-[#E1BEE7] text-zinc-900 dark:bg-[#9B6FB0] dark:text-white",
  "bg-[#BBDEFB] text-zinc-900 dark:bg-[#5B8FBF] dark:text-white",
  "bg-[#F8BBD0] text-zinc-900 dark:bg-[#C975A8] dark:text-white",
  "bg-[#FFE0B2] text-zinc-900 dark:bg-[#C49A6C] dark:text-white",
  "bg-[#D1C4E9] text-zinc-900 dark:bg-[#8B7BB8] dark:text-white",
  "bg-[#B2DFDB] text-zinc-900 dark:bg-[#5A9E98] dark:text-white",
  "bg-[#FFF9C4] text-zinc-900 dark:bg-[#B8A85A] dark:text-white",
] as const;

const CATEGORY_ICONS: LucideIcon[] = [
  Coffee,
  Soup,
  UtensilsCrossed,
  CupSoda,
  IceCream,
  Coffee,
  Soup,
  UtensilsCrossed,
];

function stationLabel(station: string) {
  switch (station) {
    case "bar":
      return "Barra";
    case "dessert":
      return "Postres";
    case "kitchen":
    default:
      return "Cocina";
  }
}

function shortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "Staff";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]![0]}.`;
}

export function MobilePosView({
  initialOrder,
  catalog,
  tableLabel,
  attendantName,
  tableReservation = null,
  opening = false,
}: {
  initialOrder: Order;
  catalog: CatalogSnapshot;
  tableLabel: string;
  attendantName: string;
  tableReservation?: TableReservation | null;
  /** Table ticket still opening — UI is interactive chrome only. */
  opening?: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [query, setQuery] = useState("");
  const [checkoutPending, startTransition] = useTransition();
  const syncQueue = useRef(Promise.resolve());
  const pendingDeltas = useRef<
    { productId: string; delta: number; serveTiming?: DrinkServeTiming }[]
  >([]);
  const pendingServerAdjusts = useRef(
    new Map<
      string,
      { productId: string; delta: number; serveTiming?: DrinkServeTiming }
    >(),
  );
  const lastBarServeTiming = useRef<Record<string, DrinkServeTiming>>({});
  const [drinkSheetOpen, setDrinkSheetOpen] = useState(false);
  const [drinkPickProduct, setDrinkPickProduct] = useState<Product | null>(
    null,
  );
  /** Mobile-only: menu first, then full-screen ticket (desktop shows both). */
  const [mobilePhase, setMobilePhase] = useState<"menu" | "ticket">("menu");
  const orderRef = useRef(order);
  orderRef.current = order;
  const catalogRef = useRef(catalog);
  catalogRef.current = catalog;
  const wasOpening = useRef(opening);
  const ticketClosed = order.status === "completed";
  const hasBill = order.items.some(
    (item) => item.status !== "cancelled" && item.quantity > 0,
  );

  function serverAdjustKey(
    productId: string,
    serveTiming?: DrinkServeTiming,
  ): string {
    return `${productId}|${serveTiming ?? ""}`;
  }

  function mergePendingServerAdjust(
    productId: string,
    delta: number,
    serveTiming?: DrinkServeTiming,
  ) {
    const key = serverAdjustKey(productId, serveTiming);
    const existing = pendingServerAdjusts.current.get(key);
    if (existing) {
      existing.delta += delta;
      if (existing.delta === 0) pendingServerAdjusts.current.delete(key);
      return;
    }
    if (delta !== 0) {
      pendingServerAdjusts.current.set(key, {
        productId,
        delta,
        serveTiming,
      });
    }
  }

  function flushPendingServerAdjusts() {
    syncQueue.current = syncQueue.current
      .then(async () => {
        while (pendingServerAdjusts.current.size > 0) {
          const batch = new Map(pendingServerAdjusts.current);
          pendingServerAdjusts.current.clear();
          for (const entry of batch.values()) {
            if (entry.delta === 0) continue;
            // #region agent log
            posDebugLog(
              "server adjust flush",
              {
                productId: entry.productId.slice(0, 8),
                delta: entry.delta,
                serveTiming: entry.serveTiming ?? null,
              },
              "H2",
            );
            // #endregion
            const result = await adjustOrderProductQuantityAction({
              orderId: orderRef.current.id,
              productId: entry.productId,
              delta: entry.delta,
              serveTiming: entry.serveTiming,
            });
            if (result.error) {
              // #region agent log
              posDebugLog(
                "server adjust error",
                { error: result.error },
                "H6",
              );
              // #endregion
              toast.error(result.error);
              mergePendingServerAdjust(
                entry.productId,
                entry.delta,
                entry.serveTiming,
              );
              continue;
            }
            if (result.order) {
              const serverQty = totalProductQty(result.order, entry.productId);
              // #region agent log
              posDebugLog(
                "server adjust ok",
                {
                  productId: entry.productId.slice(0, 8),
                  serverQty,
                },
                "H3",
              );
              // #endregion
              setOrder((current) =>
                mergeServerOrderItems(current, result.order!),
              );
            }
          }
        }
      })
      .catch(() => {
        toast.error("No pudimos actualizar el pedido.");
      });
  }

  function enqueueServerAdjust(
    productId: string,
    delta: number,
    serveTiming?: DrinkServeTiming,
  ) {
    mergePendingServerAdjust(productId, delta, serveTiming);
    flushPendingServerAdjusts();
  }

  useEffect(() => {
    if (opening || !order.tableId || order.id.startsWith("opening-")) return;
    const timer = window.setTimeout(() => {
      setCachedPosOrder(order.tableId!, order);
      const bill = order.items.some(
        (item) => item.status !== "cancelled" && item.quantity > 0,
      );
      patchCachedFloorTableStatus(
        order.tableId!,
        bill ? "occupied" : "available",
      );
      patchCachedFloorBillTotal(order.tableId!, bill ? order.totalMinor : 0);
      patchCachedFloorPendingBarDrinks(
        order.tableId!,
        bill && orderHasPendingBarDrinks(order),
      );
    }, 200);
    return () => window.clearTimeout(timer);
  }, [order, opening]);

  const categories = useMemo(
    () =>
      [...catalog.categories]
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [catalog.categories],
  );

  const [activeCategoryId, setActiveCategoryId] = useState(
    categories[0]?.id ?? "",
  );

  // When the real ticket arrives, apply taps made while opening and sync once.
  useEffect(() => {
    const justOpened = wasOpening.current && !opening;
    wasOpening.current = opening;

    if (opening) {
      setOrder(initialOrder);
      return;
    }

    if (!justOpened) return;

    const queued = [...pendingDeltas.current];
    pendingDeltas.current = [];

    let next = initialOrder;
    for (const { productId, delta, serveTiming } of queued) {
      next = applyOptimisticQuantityDelta(
        next,
        catalogRef.current,
        productId,
        delta,
        serveTiming,
      );
    }
    setOrder(next);

    for (const { productId, delta, serveTiming } of queued) {
      enqueueServerAdjust(productId, delta, serveTiming);
    }
  }, [opening, initialOrder]);

  useEffect(() => {
    if (!activeCategoryId && categories[0]) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of order.items) {
      if (item.status === "cancelled") continue;
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }, [order.items]);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.products.filter((p) => {
      if (!p.isActive) return false;
      if (activeCategoryId && p.categoryId !== activeCategoryId) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [catalog.products, activeCategoryId, query]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of catalog.products) {
      map.set(product.id, product);
    }
    return map;
  }, [catalog.products]);

  const pendingCount = order.items.filter((i) => i.status === "pending").length;
  const hasTicketLines = order.items.some(
    (i) => i.status !== "cancelled" && i.quantity > 0,
  );
  const canPrintTickets =
    hasTicketLines &&
    !opening &&
    !order.id.startsWith("opening-") &&
    order.status !== "completed";
  const attendant = shortName(attendantName);
  const ticketItemCount = order.items.reduce(
    (sum, item) =>
      item.status === "cancelled" ? sum : sum + item.quantity,
    0,
  );

  const { serveNowItems, withMealItems } = useMemo(() => {
    const serveNow: OrderItem[] = [];
    const withMeal: OrderItem[] = [];
    for (const item of order.items) {
      if (item.status === "cancelled" || item.quantity <= 0) continue;
      const product = productById.get(item.productId);
      if (isWithMealBarLine(item, product, catalog.categories)) {
        withMeal.push(item);
      } else {
        serveNow.push(item);
      }
    }
    return {
      serveNowItems: serveNow,
      withMealItems: consolidateWithMealOrderLines(withMeal),
    };
  }, [order.items, productById, catalog.categories]);

  function adjust(
    productId: string,
    delta: number,
    serveTiming?: DrinkServeTiming,
    source = "unknown",
  ) {
    if (delta === 0 || order.status === "completed") return;

    const product = productById.get(productId);
    const resolvedTiming =
      serveTiming ??
      (product && catalogProductIsPosBarDrink(product, catalog.categories)
        ? lastBarServeTiming.current[productId]
        : undefined);

    const qtyBefore = totalProductQty(orderRef.current, productId);

    const next = applyOptimisticQuantityDelta(
      orderRef.current,
      catalog,
      productId,
      delta,
      resolvedTiming,
    );
    const applied =
      totalProductQty(next, productId) !== qtyBefore ||
      (delta < 0 && next.items.length !== orderRef.current.items.length);

    if (!applied) {
      // #region agent log
      posDebugLog(
        "adjust noop",
        {
          source,
          productId: productId.slice(0, 8),
          delta,
          resolvedTiming: resolvedTiming ?? null,
          qtyBefore,
        },
        "H4",
      );
      // #endregion
      return;
    }

    setOrder(next);

    const qtyAfterLog = totalProductQty(next, productId);

    // #region agent log
    posDebugLog(
      "adjust",
      {
        source,
        productId: productId.slice(0, 8),
        delta,
        resolvedTiming: resolvedTiming ?? null,
        qtyBefore,
        qtyAfter: qtyAfterLog,
        applied: true,
        opening,
      },
      "H1",
    );
    // #endregion

    // Table ticket still opening — queue deltas until the real order id exists.
    if (opening || orderRef.current.id.startsWith("opening-")) {
      const last = pendingDeltas.current.at(-1);
      if (
        last &&
        last.productId === productId &&
        last.serveTiming === resolvedTiming
      ) {
        last.delta += delta;
      } else {
        pendingDeltas.current.push({
          productId,
          delta,
          serveTiming: resolvedTiming,
        });
      }
      return;
    }

    enqueueServerAdjust(productId, delta, resolvedTiming);
  }

  function requestAddProduct(product: Product, source = "card") {
    if (opening || ticketClosed) return;
    if (catalogProductIsPosBarDrink(product, catalog.categories)) {
      lastBarServeTiming.current[product.id] = "immediate";
      adjust(product.id, 1, "immediate", source);
      return;
    }
    adjust(product.id, 1, undefined, source);
  }

  function chooseDrinkTiming(timing: DrinkServeTiming) {
    if (!drinkPickProduct) return;
    lastBarServeTiming.current[drinkPickProduct.id] = timing;
    adjust(drinkPickProduct.id, 1, timing);
    setDrinkPickProduct(null);
  }

  function removeLine(item: OrderItem) {
    if (!canRemoveLineFromPosTicket(item)) return;
    adjust(
      item.productId,
      -item.quantity,
      item.serveTiming ?? undefined,
      "line-remove",
    );
  }

  function moveOneBarUnitToWithMeal(item: OrderItem) {
    const product = productById.get(item.productId);
    if (
      !canMoveBarUnitToWithMeal(item, product, catalog.categories) ||
      ticketClosed
    ) {
      return;
    }

    setOrder((current) => {
      const next = applyOptimisticMoveBarUnitToWithMeal(
        current,
        item.id,
        catalog,
      );
      if (next.tableId) {
        patchCachedFloorPendingBarDrinks(
          next.tableId,
          orderHasPendingBarDrinks(next),
        );
      }
      return next;
    });

    if (opening || orderRef.current.id.startsWith("opening-")) {
      return;
    }

    startTransition(async () => {
      await syncQueue.current;
      const result = await moveBarDrinkUnitToWithMealAction({
        orderId: orderRef.current.id,
        itemId: item.id,
        productId: item.productId,
      });
      if (result.error) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      if (result.order) {
        setOrder(result.order);
        if (orderRef.current.tableId) {
          setCachedPosOrder(orderRef.current.tableId, result.order);
          patchCachedFloorPendingBarDrinks(
            result.order.tableId!,
            orderHasPendingBarDrinks(result.order),
          );
        }
      }
    });
  }

  function renderOrderLine(item: OrderItem, section: "main" | "withMeal") {
    const product = productById.get(item.productId);
    const canMove =
      section === "main" &&
      canMoveBarUnitToWithMeal(item, product, catalog.categories);
    const subtitle =
      section === "withMeal"
        ? orderItemServeHint(item)
        : item.status === "pending"
          ? "Pendiente"
          : item.status === "sent"
            ? "Enviado"
            : "Enviado";

    const rowBody = (
      <>
        <p className="truncate text-sm font-medium">{item.productName}</p>
        {section === "withMeal" ? (
          <span className="mt-1 inline-flex rounded-full bg-[#FFE0B2]/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8B5A2B] dark:bg-[#C49A6C]/30 dark:text-[#FFE0B2]">
            {orderItemServeHint(item)}
          </span>
        ) : canMove ? (
          <p className="text-[11px] text-muted-foreground">
            Toca para servir con la comida
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </>
    );

    return (
      <div
        key={item.id}
        className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-muted/70"
      >
        <button
          type="button"
          disabled={ticketClosed || !canRemoveLineFromPosTicket(item)}
          onClick={() => removeLine(item)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground transition-colors group-hover:bg-rose-500/15 group-hover:text-rose-600 disabled:opacity-50 dark:group-hover:text-rose-400"
          aria-label={`Eliminar ${item.productName}`}
          title={
            canRemoveLineFromPosTicket(item) ? "Eliminar" : "No se puede eliminar"
          }
        >
          <span className="group-hover:hidden tabular-nums">{item.quantity}</span>
          <Trash2 className="hidden size-3.5 group-hover:block" />
        </button>
        {canMove ? (
          <button
            type="button"
            disabled={ticketClosed}
            onClick={() => moveOneBarUnitToWithMeal(item)}
            className={cn(
              "min-w-0 flex-1 cursor-pointer rounded-xl text-left transition-colors",
              !ticketClosed && "hover:bg-muted/50 active:bg-muted/80",
            )}
            aria-label={`${item.productName}, mover 1 con la comida`}
          >
            {rowBody}
          </button>
        ) : (
          <div className="min-w-0 flex-1">{rowBody}</div>
        )}
        <span className="shrink-0 text-sm tabular-nums text-foreground/80">
          {formatCurrency(item.lineTotalMinor)}
        </span>
      </div>
    );
  }

  async function runPrintOrderTickets(reprint: boolean) {
    const printResult = await printStationTicketsAction({
      orderId: orderRef.current.id,
      reprint,
    });
    if (printResult.error) {
      toast.error(printResult.error);
      return false;
    }
    if (
      !printResult.combinedPdfBase64 &&
      !printResult.stationPdfs?.length
    ) {
      toast.message("Nada para imprimir");
      return false;
    }
    toast.message(reprint ? "Reimprimiendo tickets" : "Tickets listos", {
      description:
        "Elige impresora Cocina o Bar en cada diálogo de impresión.",
    });
    await printStationTicketPdfs({
      combinedPdfBase64: printResult.combinedPdfBase64,
      stationPdfs: printResult.stationPdfs,
    });
    return true;
  }

  function reprintTickets() {
    if (!canPrintTickets || opening || order.id.startsWith("opening-")) {
      return;
    }
    startTransition(async () => {
      await syncQueue.current;
      await runPrintOrderTickets(true);
    });
  }

  function sendToKitchen() {
    if (opening || order.id.startsWith("opening-")) return;
    startTransition(async () => {
      await syncQueue.current;
      const result = await sendOrderAction(order.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.order) setOrder(result.order);
      if (order.tableId) {
        const synced = result.order ?? order;
        const total = synced.totalMinor;
        const hasBill = synced.items.some(
          (item) => item.status !== "cancelled" && item.quantity > 0,
        );
        patchCachedFloorTableStatus(
          order.tableId,
          hasBill ? "occupied" : "available",
        );
        patchCachedFloorBillTotal(order.tableId, hasBill ? total : 0);
        patchCachedFloorPendingBarDrinks(
          order.tableId,
          hasBill && orderHasPendingBarDrinks(synced),
        );
      }

      await runPrintOrderTickets(false);

      toast.success("Pedido enviado");
    });
  }

  function pay() {
    if (opening || order.id.startsWith("opening-")) return;
    startTransition(async () => {
      await syncQueue.current;
      const result = await payOrderAction({
        orderId: order.id,
        methodCode: paymentMethod,
        amountMinor: order.totalMinor,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (order.tableId) {
        clearCachedPosBoot(order.tableId);
        patchCachedFloorTableStatus(order.tableId, "available");
        patchCachedFloorBillTotal(order.tableId, 0);
        patchCachedFloorPendingBarDrinks(order.tableId, false);
      }
      toast.success("Pago registrado");
      void warmFloorBoot({ force: true });
      router.push("/floor");
    });
  }

  function goToSalon() {
    void warmFloorBoot();
    router.push("/floor");
  }

  function primaryAction() {
    if (pendingCount > 0) sendToKitchen();
    else pay();
  }

  // Prefetch salon while working a table.
  useEffect(() => {
    router.prefetch("/floor");
    void warmFloorBoot();
  }, [router]);

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-5.5rem)] flex-col bg-background text-foreground md:-m-6 md:min-h-[calc(100dvh-4.5rem)] md:flex-row">
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col md:min-h-[calc(100dvh-4.5rem)]",
          mobilePhase === "ticket" && "max-md:hidden",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToSalon}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-muted px-3.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-muted/80"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Salón
          </button>
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              className="h-11 w-full rounded-2xl border-0 bg-muted pr-4 pl-10 text-sm text-foreground outline-none ring-1 ring-border placeholder:text-muted-foreground focus:ring-ring"
            />
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Categorías
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {categories.map((cat, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]!;
              const count = catalog.products.filter(
                (p) => p.isActive && p.categoryId === cat.id,
              ).length;
              const selected = cat.id === activeCategoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    "flex min-h-[108px] flex-col items-start justify-between rounded-[20px] p-4 text-left transition-transform active:scale-[0.98]",
                    CATEGORY_PASTELS[index % CATEGORY_PASTELS.length],
                    selected &&
                      "ring-2 ring-foreground/30 ring-offset-2 ring-offset-background",
                  )}
                >
                  <Icon className="size-5 opacity-80" aria-hidden />
                  <div>
                    <p className="text-base font-semibold leading-tight">
                      {cat.name}
                    </p>
                    <p className="mt-0.5 text-xs opacity-70">
                      {count} {count === 1 ? "ítem" : "ítems"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Menú
          </h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay productos en esta categoría.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const qty = qtyByProduct.get(product.id) ?? 0;
                const active = qty > 0;
                const canAdd = !opening && !ticketClosed;
                // Same figure as a qty-1 line on the right (includes tax).
                const displayPriceMinor = calculateLineItem({
                  unitPriceMinor: product.priceMinor,
                  quantity: 1,
                  taxRateBps: product.taxRateBps,
                }).lineTotalMinor;
                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={canAdd ? 0 : -1}
                    aria-disabled={!canAdd}
                    aria-label={`Agregar ${product.name}`}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("[data-pos-stepper]")) {
                        return;
                      }
                      if (!canAdd) return;
                      requestAddProduct(product, "card");
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      if (!canAdd) return;
                      requestAddProduct(product, "card-key");
                    }}
                    className={cn(
                      "flex min-h-[150px] cursor-pointer flex-col justify-between rounded-[20px] p-4 text-left transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                      "bg-card text-card-foreground ring-1 ring-border",
                      !canAdd && "pointer-events-none opacity-60",
                    )}
                  >
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        Pedidos → {stationLabel(product.preparationStation)}
                      </p>
                      <p className="mt-2 text-base font-semibold leading-snug">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(displayPriceMinor)}
                      </p>
                    </div>

                    <div
                      data-pos-stepper
                      className={cn(
                        "mt-3 flex items-center justify-between rounded-full px-1 py-1",
                        active
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground",
                      )}
                    >
                      <button
                        type="button"
                        disabled={!canAdd || qty === 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          const isBar = catalogProductIsPosBarDrink(
                            product,
                            catalog.categories,
                          );
                          adjust(
                            product.id,
                            -1,
                            isBar ? "immediate" : undefined,
                            "stepper-minus",
                          );
                        }}
                        className="flex size-8 items-center justify-center rounded-full disabled:opacity-40"
                        aria-label={`Quitar ${product.name}`}
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                        {qty}
                      </span>
                      <button
                        type="button"
                        disabled={!canAdd}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (catalogProductIsPosBarDrink(product, catalog.categories)) {
                            lastBarServeTiming.current[product.id] = "immediate";
                            adjust(product.id, 1, "immediate", "stepper-plus");
                          } else {
                            adjust(product.id, 1, undefined, "stepper-plus");
                          }
                        }}
                        className="flex size-8 items-center justify-center rounded-full disabled:opacity-40"
                        aria-label={`Agregar ${product.name}`}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        </div>

        <div className="shrink-0 border-t border-border bg-background p-4 md:hidden">
          <button
            type="button"
            disabled={
              opening ||
              ticketClosed ||
              ticketItemCount === 0 ||
              order.id.startsWith("opening-")
            }
            onClick={() => setMobilePhase("ticket")}
            className="flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-foreground text-background transition-opacity disabled:opacity-40"
          >
            <span className="text-sm font-semibold">Continuar</span>
            <span className="text-[11px] font-normal opacity-90">
              {ticketItemCount}{" "}
              {ticketItemCount === 1 ? "producto" : "productos"} ·{" "}
              {formatCurrency(order.totalMinor)}
            </span>
          </button>
        </div>
      </div>

      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-t border-border bg-card md:w-[340px] md:border-t-0 md:border-l lg:w-[380px]",
          mobilePhase === "menu"
            ? "max-md:hidden"
            : "max-md:fixed max-md:inset-0 max-md:z-50 max-md:flex max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:border-0",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-5">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <button
              type="button"
              onClick={() => setMobilePhase("menu")}
              className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground ring-1 ring-border md:hidden"
              aria-label="Volver al menú"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Mesa {tableLabel}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{attendant}</p>
            </div>
          </div>
          {order.tableId ? (
            <PosTableHeaderMenu
              tableId={order.tableId}
              tableLabel={tableLabel}
              hasBill={hasBill}
              initialReservation={tableReservation}
              disabled={ticketClosed || opening || checkoutPending}
            />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {order.items.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              Agrega productos desde el menú.
            </p>
          ) : (
            <>
              {serveNowItems.map((item) => renderOrderLine(item, "main"))}
              {withMealItems.length > 0 ? (
                <div className="-mx-3 mt-3 space-y-1 border-t border-dashed border-border px-3 pt-3">
                  {withMealItems.map((item) =>
                    renderOrderLine(item, "withMeal"),
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-5">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatCurrency(order.subtotalMinor)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Impuestos</span>
              <span className="tabular-nums">
                {formatCurrency(order.taxMinor)}
              </span>
            </div>
            <div className="flex items-end justify-between pt-1">
              <span className="text-base font-medium">Total</span>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(order.totalMinor)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "cash", label: "Efectivo", icon: Banknote },
                { id: "card", label: "Tarjeta", icon: CreditCard },
                { id: "transfer", label: "Transfer", icon: Wallet },
              ] as const
            ).map((method) => {
              const selected = paymentMethod === method.id;
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => !opening && setPaymentMethod(method.id)}
                  disabled={opening}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] transition-colors",
                    selected
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground ring-1 ring-border",
                    opening && "opacity-50",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {method.label}
                </button>
              );
            })}
          </div>

          {canPrintTickets ? (
            <button
              type="button"
              disabled={opening || checkoutPending}
              onClick={reprintTickets}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-muted text-sm font-semibold text-foreground ring-1 ring-border transition-opacity hover:bg-muted/80 disabled:opacity-40"
            >
              <Printer className="size-4" aria-hidden />
              Reimprimir tickets
            </button>
          ) : null}

          <button
            type="button"
            disabled={
              opening ||
              checkoutPending ||
              order.items.length === 0 ||
              order.status === "completed" ||
              order.id.startsWith("opening-")
            }
            onClick={primaryAction}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-foreground text-sm font-semibold text-background transition-opacity disabled:opacity-40"
          >
            {opening
              ? "Abriendo mesa…"
              : pendingCount > 0
                ? "Enviar pedido"
                : `Cobrar ${formatCurrency(order.totalMinor)}`}
          </button>
        </div>
      </aside>

      <DrinkServeSheet
        product={drinkPickProduct}
        open={drinkSheetOpen}
        onOpenChange={(open) => {
          setDrinkSheetOpen(open);
          if (!open) setDrinkPickProduct(null);
        }}
        onChoose={chooseDrinkTiming}
      />
    </div>
  );
}
