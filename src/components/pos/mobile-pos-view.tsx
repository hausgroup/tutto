"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Coffee,
  CupSoda,
  IceCream,
  Minus,
  Plus,
  Receipt,
  Soup,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { CatalogSearchField } from "@/components/catalog/catalog-search-field";
import { filterMenuProductsByQuery } from "@/lib/catalog/menu-search";
import { Button } from "@/components/arc/button/button";
import type { CatalogSnapshot, Product } from "@/lib/catalog/types";
import type { DrinkServeTiming, Order, OrderItem } from "@/lib/orders/types";
import type {
  RestaurantTable,
  TableReservation,
  TableStatus,
} from "@/lib/floor/types";
import { TableReservationDialog } from "@/components/floor/table-reservation-dialog";
import { PosTableReservationIndicator } from "@/components/pos/pos-table-reservation-indicator";
import {
  adjustOrderProductQuantityAction,
  cancelTableReservationAction,
  moveBarDrinkUnitToWithMealAction,
  getOrderCheckoutAction,
  releaseTableSessionAction,
  removeOrderLineAction,
  sendPosDraftAction,
} from "@/lib/orders/actions";
import {
  applyOptimisticSendOrder,
  pendingDraftLinesFromOrder,
} from "@/lib/orders/pos-draft-sync";
import { buildStationTicketPdfsFromOrder } from "@/lib/printing/build-station-ticket-pdfs";
import { printStationTicketPdfPayload } from "@/lib/printing/browser-print";
import {
  applyOptimisticMoveBarUnitToWithMeal,
  applyOptimisticQuantityDelta,
  applyOptimisticRemoveOrderLine,
  reconcileOrderAfterServer,
} from "@/lib/orders/optimistic";
import { orderHasPendingBarDrinks } from "@/lib/orders/bar-delivery";
import { resolveServeTiming } from "@/lib/orders/drink-serve";
import {
  canMoveBarUnitToWithMeal,
  canRemoveLineFromPosTicket,
  catalogProductIsPosBarDrink,
  isWithMealBarLine,
  orderItemServeHint,
} from "@/lib/orders/drink-serve";
import { consolidateWithMealOrderLines } from "@/lib/orders/consolidate-lines";
import { DrinkServeSheet } from "@/components/pos/drink-serve-sheet";
import { PosCheckoutDialog } from "@/components/pos/pos-checkout-dialog";
import { TableSessionPreviewDialog } from "@/components/pos/table-session-preview-dialog";
import {
  draftTicketTotals,
  filterDraftItems,
  groupUnpaidSentItemsBySend,
  orderHasSentBill,
  orderHasAnyActiveItems,
  unpaidSentBillTotals,
} from "@/lib/orders/bill-segments";
import { calculateLineItem } from "@/lib/orders/calculate";
import {
  clearCachedPosBoot,
  setCachedPosOrder,
} from "@/lib/pos/client-cache";
import {
  patchCachedFloorBillTotal,
  patchCachedFloorCancelReservation,
  patchCachedFloorPendingBarDrinks,
  patchCachedFloorTableStatus,
  getCachedFloorBoot,
  refreshFloorBootInBackground,
  warmFloorBoot,
} from "@/lib/floor/client-cache";
import { formatCurrency } from "@/lib/utils/money";
import { cn } from "@/lib/utils";

function floorSalonStatusFromPos(
  hasSentBill: boolean,
  hasReservation: boolean,
): TableStatus {
  if (hasSentBill) return "occupied";
  if (hasReservation) return "reserved";
  return "available";
}

function draftProductQty(order: Order, productId: string): number {
  let sum = 0;
  for (const item of order.items) {
    if (item.productId !== productId || item.status !== "pending") continue;
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

function salonHref(returnAreaId?: string) {
  if (!returnAreaId?.trim()) return "/floor";
  return `/floor?area=${encodeURIComponent(returnAreaId.trim())}`;
}

function pendingDraftSummary(order: Order): string {
  return order.items
    .filter((item) => item.status === "pending")
    .map((item) => `${item.productId.slice(0, 8)}×${item.quantity}`)
    .join(",");
}

// #region agent log
function posDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  fetch("http://127.0.0.1:7657/ingest/9c21ec7a-f83c-47b2-a116-b9a5d72f1fd1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "af00c9",
    },
    body: JSON.stringify({
      sessionId: "af00c9",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

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
  returnAreaId = "",
}: {
  initialOrder: Order;
  catalog: CatalogSnapshot;
  tableLabel: string;
  attendantName: string;
  tableReservation?: TableReservation | null;
  /** Table ticket still opening — UI is interactive chrome only. */
  opening?: boolean;
  /** Floor zone to restore when leaving POS (from Salón URL). */
  returnAreaId?: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [sessionPreviewOpen, setSessionPreviewOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [activeReservation, setActiveReservation] = useState(
    tableReservation ?? null,
  );
  const [reprintPending, setReprintPending] = useState(false);
  const sendSyncInFlight = useRef(false);
  const [cancelReservationPending, startCancelReservation] = useTransition();

  useEffect(() => {
    setActiveReservation(tableReservation ?? null);
  }, [tableReservation]);

  const tableForReserve = useMemo((): RestaurantTable | null => {
    if (!order.tableId) return null;
    const floorTable = getCachedFloorBoot()?.snapshot.tables.find(
      (table) => table.id === order.tableId,
    );
    return {
      id: order.tableId,
      restaurantId: order.restaurantId,
      floorAreaId: floorTable?.floorAreaId ?? "",
      label: tableLabel,
      capacity: floorTable?.capacity ?? 4,
      status: activeReservation ? "reserved" : "available",
      posX: 0,
      posY: 0,
      width: 96,
      height: 96,
      rotationDeg: 0,
      shape: "square",
      isActive: true,
      reservation: activeReservation,
    };
  }, [order.tableId, order.restaurantId, tableLabel, activeReservation]);

  function handleCancelReservation() {
    if (!order.tableId || !activeReservation) return;
    const tableId = order.tableId;
    const groupId = activeReservation.groupId;
    startCancelReservation(async () => {
      const result = await cancelTableReservationAction({ tableId });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      patchCachedFloorCancelReservation(tableId, groupId);
      patchCachedFloorTableStatus(tableId, "available");
      setActiveReservation(null);
      clearCachedPosBoot(tableId);
      refreshFloorBootInBackground();
      router.push("/floor");
    });
  }

  const syncQueue = useRef(Promise.resolve());
  /** Bumped on ticket edits that must ignore stale in-flight server snapshots. */
  const posSyncEpoch = useRef(0);
  const pendingDeltas = useRef<
    { productId: string; delta: number; serveTiming?: DrinkServeTiming }[]
  >([]);
  const pendingServerAdjusts = useRef(
    new Map<
      string,
      { productId: string; delta: number; serveTiming?: DrinkServeTiming }
    >(),
  );
  const pendingMealMoves = useRef<
    { productId: string; itemId: string }[]
  >([]);
  /** While a ticket line delete is in flight, ignore server rows for that product. */
  const productsPendingLineRemoval = useRef(new Set<string>());
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
  const attendantNameRef = useRef(attendantName);
  attendantNameRef.current = attendantName;
  const wasOpening = useRef(opening);
  const ticketClosed = order.status === "completed";
  const hasSentBill = orderHasSentBill(order);
  const hasActiveItems = orderHasAnyActiveItems(order);
  const sessionBill = useMemo(() => unpaidSentBillTotals(order), [order]);
  const draftTotals = useMemo(() => draftTicketTotals(order), [order]);
  const sessionBatches = useMemo(
    () => groupUnpaidSentItemsBySend(order.items),
    [order.items],
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
    const product = catalogRef.current.products.find((p) => p.id === productId);
    const resolved = product
      ? resolveServeTiming(product, catalogRef.current.categories, serveTiming)
      : (serveTiming ?? null);
    const key = serverAdjustKey(productId, resolved ?? undefined);
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
        serveTiming: resolved ?? undefined,
      });
    }
  }

  function coalesceAdjustBatch(
    batch: Map<
      string,
      { productId: string; delta: number; serveTiming?: DrinkServeTiming }
    >,
  ) {
    const out = new Map<
      string,
      { productId: string; delta: number; serveTiming?: DrinkServeTiming }
    >();
    for (const entry of batch.values()) {
      mergePendingServerAdjustIntoMap(out, entry);
    }
    return out;
  }

  function mergePendingServerAdjustIntoMap(
    map: Map<
      string,
      { productId: string; delta: number; serveTiming?: DrinkServeTiming }
    >,
    entry: { productId: string; delta: number; serveTiming?: DrinkServeTiming },
  ) {
    const product = catalogRef.current.products.find(
      (p) => p.id === entry.productId,
    );
    const resolved = product
      ? resolveServeTiming(
          product,
          catalogRef.current.categories,
          entry.serveTiming,
        )
      : (entry.serveTiming ?? null);
    const key = serverAdjustKey(entry.productId, resolved ?? undefined);
    const existing = map.get(key);
    if (existing) {
      existing.delta += entry.delta;
      if (existing.delta === 0) map.delete(key);
    } else if (entry.delta !== 0) {
      map.set(key, {
        productId: entry.productId,
        delta: entry.delta,
        serveTiming: resolved ?? undefined,
      });
    }
  }

  function pendingAdjustsSnapshot() {
    return [...pendingServerAdjusts.current.values()].filter(
      (entry) =>
        !productsPendingLineRemoval.current.has(entry.productId),
    );
  }

  function clearPendingServerAdjustsForProduct(productId: string) {
    for (const key of pendingServerAdjusts.current.keys()) {
      if (key.startsWith(`${productId}|`)) {
        pendingServerAdjusts.current.delete(key);
      }
    }
  }

  function invalidatePosSync() {
    posSyncEpoch.current += 1;
  }

  function enqueuePendingMealMove(productId: string, itemId: string) {
    pendingMealMoves.current.push({ productId, itemId });
  }

  function pendingMealMovesSnapshot() {
    const counts = new Map<string, number>();
    for (const job of pendingMealMoves.current) {
      counts.set(job.productId, (counts.get(job.productId) ?? 0) + 1);
    }
    return [...counts.entries()].map(([productId, count]) => ({
      productId,
      count,
    }));
  }

  function applyServerOrder(server: Order): Order {
    const pending = pendingAdjustsSnapshot();
    const serverBase =
      productsPendingLineRemoval.current.size === 0
        ? server
        : {
            ...server,
            items: server.items.filter(
              (line) =>
                !productsPendingLineRemoval.current.has(line.productId),
            ),
          };
    const next = reconcileOrderAfterServer(
      serverBase,
      catalogRef.current,
      pending,
      pendingMealMovesSnapshot(),
    );
    // #region agent log
    posDebugLog("C", "mobile-pos-view:applyServerOrder", "reconcile", {
      orderId: server.id.slice(0, 8),
      serverPending: pendingDraftSummary(serverBase),
      pendingAdjusts: pending.map((p) => `${p.productId.slice(0, 8)}:${p.delta}`),
      resultPending: pendingDraftSummary(next),
      serverLines: serverBase.items.length,
      resultLines: next.items.length,
    });
    // #endregion
    setOrder(next);
    return next;
  }

  function flushPendingMealMoves() {
    syncQueue.current = syncQueue.current
      .then(async () => {
        while (pendingMealMoves.current.length > 0) {
          const job = pendingMealMoves.current[0]!;

          const result = await moveBarDrinkUnitToWithMealAction({
            orderId: orderRef.current.id,
            itemId: job.itemId,
            productId: job.productId,
          });
          if (result.error) {
            toast.error(result.error);
            return;
          }
          pendingMealMoves.current.shift();
          if (result.order) {
            applyServerOrder(result.order);
          }
        }
      })
      .catch(() => {
        toast.error("No se pudo mover la bebida.");
      });
  }

  function flushPendingServerAdjusts() {
    syncQueue.current = syncQueue.current
      .then(async () => {
        while (pendingServerAdjusts.current.size > 0) {
          const epochAtBatch = posSyncEpoch.current;
          const batch = coalesceAdjustBatch(
            new Map(pendingServerAdjusts.current),
          );
          pendingServerAdjusts.current.clear();
          for (const entry of batch.values()) {
            if (entry.delta === 0) continue;
            if (productsPendingLineRemoval.current.has(entry.productId)) {
              continue;
            }
            if (epochAtBatch !== posSyncEpoch.current) {
              mergePendingServerAdjust(
                entry.productId,
                entry.delta,
                entry.serveTiming,
              );
              continue;
            }
            const result = await adjustOrderProductQuantityAction({
              orderId: orderRef.current.id,
              productId: entry.productId,
              delta: entry.delta,
              serveTiming: entry.serveTiming,
            });
            if (result.error) {
              toast.error(result.error);
              mergePendingServerAdjust(
                entry.productId,
                entry.delta,
                entry.serveTiming,
              );
              continue;
            }
            if (result.order && epochAtBatch === posSyncEpoch.current) {
              // #region agent log
              posDebugLog("D", "mobile-pos-view:flushAdjust", "server response", {
                sentDelta: entry.delta,
                productId: entry.productId.slice(0, 8),
                serverTicket: pendingDraftSummary(result.order),
                uiBefore: pendingDraftSummary(orderRef.current),
              });
              // #endregion
              applyServerOrder(result.order);
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
      const nextStatus = floorSalonStatusFromPos(
        hasSentBill,
        activeReservation != null,
      );
      setCachedPosOrder(order.tableId!, order);
      patchCachedFloorTableStatus(order.tableId!, nextStatus);
      patchCachedFloorBillTotal(
        order.tableId!,
        hasSentBill ? sessionBill.totalMinor : 0,
      );
      patchCachedFloorPendingBarDrinks(
        order.tableId!,
        hasSentBill && orderHasPendingBarDrinks(order),
      );
    }, 200);
    return () => window.clearTimeout(timer);
  }, [order, opening, hasSentBill, sessionBill.totalMinor, activeReservation]);

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
  const [menuSearchQuery, setMenuSearchQuery] = useState("");

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const searchActive = menuSearchQuery.trim().length > 0;

  const displayCategories = useMemo(() => {
    if (!searchActive) return categories;
    return categories.filter((category) =>
      filterMenuProductsByQuery(
        catalog.products.filter(
          (product) => product.isActive && product.categoryId === category.id,
        ),
        menuSearchQuery,
        categoryNameById,
      ).length > 0,
    );
  }, [
    categories,
    searchActive,
    catalog.products,
    menuSearchQuery,
    categoryNameById,
  ]);

  // When the real ticket arrives, apply taps made while opening and sync once.
  useEffect(() => {
    const wasOpeningBefore = wasOpening.current;
    const justOpened = wasOpeningBefore && !opening;
    const justStartedOpening = !wasOpeningBefore && opening;
    wasOpening.current = opening;

    if (justStartedOpening) {
      pendingDeltas.current = [];
      pendingServerAdjusts.current.clear();
      orderRef.current = initialOrder;
      setOrder(initialOrder);
      // #region agent log
      posDebugLog("A", "mobile-pos-view:openingEffect", "justStartedOpening", {
        orderId: initialOrder.id.slice(0, 12),
        items: pendingDraftSummary(initialOrder),
      });
      // #endregion
      return;
    }

    if (opening) {
      return;
    }

    if (!justOpened) return;

    const queued = [...pendingDeltas.current];
    pendingDeltas.current = [];
    const beforeReplay = pendingDraftSummary(orderRef.current);

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
    orderRef.current = next;
    setOrder(next);

    // #region agent log
    posDebugLog("E", "mobile-pos-view:openingEffect", "justOpened replay", {
      orderId: next.id.slice(0, 12),
      queued: queued.map(
        (q) => `${q.productId.slice(0, 8)}:${q.delta}:${q.serveTiming ?? ""}`,
      ),
      beforeReplay,
      afterReplay: pendingDraftSummary(next),
      initialItems: pendingDraftSummary(initialOrder),
    });
    // #endregion

  }, [opening, initialOrder]);

  useEffect(() => {
    if (!activeCategoryId && categories[0]) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of order.items) {
      if (item.status !== "pending") continue;
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }, [order.items]);

  const products = useMemo(() => {
    const scoped = catalog.products.filter((p) => {
      if (!p.isActive) return false;
      if (
        !searchActive &&
        activeCategoryId &&
        p.categoryId !== activeCategoryId
      ) {
        return false;
      }
      return true;
    });
    return filterMenuProductsByQuery(
      scoped,
      menuSearchQuery,
      categoryNameById,
    );
  }, [
    catalog.products,
    activeCategoryId,
    menuSearchQuery,
    categoryNameById,
    searchActive,
  ]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of catalog.products) {
      map.set(product.id, product);
    }
    return map;
  }, [catalog.products]);

  const draftItems = useMemo(
    () => filterDraftItems(order.items),
    [order.items],
  );
  const hasDraftToSend = draftItems.length > 0;
  const canPrintTickets =
    hasSentBill &&
    !opening &&
    !order.id.startsWith("opening-") &&
    order.status !== "completed";
  const attendant = shortName(attendantName);
  const ticketItemCount = order.items.reduce(
    (sum, item) =>
      item.status === "pending" ? sum + item.quantity : sum,
    0,
  );
  const ticketTotals = hasDraftToSend ? draftTotals : sessionBill;

  const { serveNowItems, withMealItems } = useMemo(() => {
    const serveNow: OrderItem[] = [];
    const withMeal: OrderItem[] = [];
    for (const item of order.items) {
      if (item.status !== "pending" || item.quantity <= 0) continue;
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

    const qtyBefore = draftProductQty(orderRef.current, productId);

    const next = applyOptimisticQuantityDelta(
      orderRef.current,
      catalog,
      productId,
      delta,
      resolvedTiming,
    );
    const qtyAfter = draftProductQty(next, productId);
    const applied =
      qtyAfter !== qtyBefore ||
      (delta < 0 && next.items.length !== orderRef.current.items.length);

    if (!applied) {
      return;
    }

    orderRef.current = next;
    setOrder(next);

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
      // #region agent log
      posDebugLog("B", "mobile-pos-view:adjust", "opening queue", {
        delta,
        opening,
        orderId: orderRef.current.id.slice(0, 12),
        ticket: pendingDraftSummary(next),
        pendingDeltas: pendingDeltas.current.map(
          (p) => `${p.productId.slice(0, 8)}:${p.delta}`,
        ),
      });
      // #endregion
      return;
    }

    if (delta < 0 && qtyBefore === 0) {
      // #region agent log
      posDebugLog("B", "mobile-pos-view:adjust", "server enqueue sent", {
        delta,
        productId: productId.slice(0, 8),
      });
      // #endregion
      enqueueServerAdjust(productId, delta, resolvedTiming);
      return;
    }

    // #region agent log
    posDebugLog("F", "mobile-pos-view:adjust", "local draft only", {
      delta,
      productId: productId.slice(0, 8),
      ticket: pendingDraftSummary(next),
    });
    // #endregion
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

  function serveTimingForLine(item: OrderItem): DrinkServeTiming | undefined {
    if (item.serveTiming === "with_meal") return "with_meal";
    if (item.serveTiming === "immediate") return "immediate";
    const product = productById.get(item.productId);
    if (product && catalogProductIsPosBarDrink(product, catalog.categories)) {
      return "immediate";
    }
    return undefined;
  }

  function removeLine(item: OrderItem) {
    if (!canRemoveLineFromPosTicket(item)) return;

    invalidatePosSync();
    const next = applyOptimisticRemoveOrderLine(orderRef.current, item.id);
    if (next.items.length >= orderRef.current.items.length) return;

    clearPendingServerAdjustsForProduct(item.productId);
    orderRef.current = next;
    setOrder(next);
    if (next.tableId) {
      patchCachedFloorPendingBarDrinks(
        next.tableId,
        orderHasPendingBarDrinks(next),
      );
    }

    const timing = serveTimingForLine(item);
    const optimisticOnly = item.id.startsWith("optimistic-");

    if (opening || orderRef.current.id.startsWith("opening-")) {
      const last = pendingDeltas.current.at(-1);
      if (
        last &&
        last.productId === item.productId &&
        last.serveTiming === timing
      ) {
        last.delta -= item.quantity;
      } else {
        pendingDeltas.current.push({
          productId: item.productId,
          delta: -item.quantity,
          serveTiming: timing,
        });
      }
      return;
    }

    if (item.status === "pending" || optimisticOnly) {
      return;
    }

    productsPendingLineRemoval.current.add(item.productId);
    syncQueue.current = syncQueue.current
      .then(async () => {
        const result = await removeOrderLineAction({
          orderId: orderRef.current.id,
          itemId: item.id,
        });
        if (result.error) {
          productsPendingLineRemoval.current.delete(item.productId);
          toast.error(result.error);
          return;
        }
        if (result.order) {
          const synced = applyServerOrder(result.order);
          productsPendingLineRemoval.current.delete(item.productId);
          if (orderRef.current.tableId) {
            setCachedPosOrder(orderRef.current.tableId, synced);
            patchCachedFloorPendingBarDrinks(
              result.order.tableId!,
              orderHasPendingBarDrinks(synced),
            );
          }
        }
      })
      .catch(() => {
        productsPendingLineRemoval.current.delete(item.productId);
        toast.error("No se pudo eliminar la línea.");
      });
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
      const source = current.items.find((line) => line.id === item.id);
      if (
        !source ||
        !canMoveBarUnitToWithMeal(source, product, catalog.categories)
      ) {
        return current;
      }
      const next = applyOptimisticMoveBarUnitToWithMeal(
        current,
        source.id,
        catalog,
      );
      orderRef.current = next;
      if (next.tableId) {
        patchCachedFloorPendingBarDrinks(
          next.tableId,
          orderHasPendingBarDrinks(next),
        );
      }
      return next;
    });

    enqueuePendingMealMove(item.productId, item.id);
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

  async function runPrintOrderTickets(reprint: boolean, itemIds?: string[]) {
    const payload = await buildStationTicketPdfsFromOrder(
      orderRef.current,
      catalogRef.current,
      {
        itemIds,
        reprint,
        attendantName: attendantNameRef.current,
      },
    );
    if (!payload) return false;
    await printStationTicketPdfPayload(payload);
    return true;
  }

  function reprintTickets() {
    if (
      !canPrintTickets ||
      opening ||
      order.id.startsWith("opening-") ||
      reprintPending
    ) {
      return;
    }
    void (async () => {
      setReprintPending(true);
      try {
        await syncQueue.current;
        await runPrintOrderTickets(true);
      } finally {
        setReprintPending(false);
      }
    })();
  }

  function sendToKitchen() {
    if (opening || order.id.startsWith("opening-") || sendSyncInFlight.current) {
      return;
    }
    sendSyncInFlight.current = true;
    const snapshot = orderRef.current;
    const orderId = snapshot.id;
    const draftLines = pendingDraftLinesFromOrder(
      snapshot,
      catalogRef.current,
    );
    if (draftLines.length === 0) return;

    const itemIdsToPrint = filterDraftItems(snapshot.items).map(
      (item) => item.id,
    );

    const optimistic = applyOptimisticSendOrder(snapshot);
    orderRef.current = optimistic;
    setOrder(optimistic);
    setMobilePhase("menu");
    pendingServerAdjusts.current.clear();

    if (optimistic.tableId) {
      const bill = orderHasSentBill(optimistic);
      patchCachedFloorTableStatus(
        optimistic.tableId,
        floorSalonStatusFromPos(bill, activeReservation != null),
      );
      patchCachedFloorBillTotal(
        optimistic.tableId,
        bill ? optimistic.totalMinor : 0,
      );
      patchCachedFloorPendingBarDrinks(
        optimistic.tableId,
        bill && orderHasPendingBarDrinks(optimistic),
      );
    }

    void (async () => {
      try {
        const payload =
          itemIdsToPrint.length > 0
            ? await buildStationTicketPdfsFromOrder(
                snapshot,
                catalogRef.current,
                {
                  itemIds: itemIdsToPrint,
                  attendantName: attendantNameRef.current,
                },
              )
            : null;
        if (payload) await printStationTicketPdfPayload(payload);
      } catch {
        toast.error("No pudimos imprimir los tickets.");
      }
    })();

    void (async () => {
      try {
        const result = await sendPosDraftAction({ orderId, lines: draftLines });
        if (result.error) {
          orderRef.current = snapshot;
          setOrder(snapshot);
          toast.error(result.error);
          return;
        }
        if (result.order) {
          orderRef.current = result.order;
          setOrder(result.order);
          if (result.order.tableId) {
            setCachedPosOrder(result.order.tableId, result.order);
          }
        }
      } finally {
        sendSyncInFlight.current = false;
      }
    })();
  }

  function openCheckout() {
    if (opening || order.id.startsWith("opening-")) return;
    setCheckoutOpen(true);
    void syncQueue.current;
  }

  function handleCheckoutCompleted() {
    if (order.tableId) {
      clearCachedPosBoot(order.tableId);
      patchCachedFloorTableStatus(order.tableId, "available");
      patchCachedFloorBillTotal(order.tableId, 0);
      patchCachedFloorPendingBarDrinks(order.tableId, false);
    }
    refreshFloorBootInBackground();
    router.push(salonHref(returnAreaId));
  }

  function goToSalon() {
    const current = orderRef.current;
    const tableId = current.tableId;
    const hasReservation = activeReservation != null;

    if (tableId) {
      clearCachedPosBoot(tableId);
      patchCachedFloorTableStatus(
        tableId,
        floorSalonStatusFromPos(orderHasSentBill(current), hasReservation),
      );
      if (!orderHasSentBill(current)) {
        patchCachedFloorBillTotal(tableId, 0);
        patchCachedFloorPendingBarDrinks(tableId, false);
      }
    }

    refreshFloorBootInBackground();
    router.push(salonHref(returnAreaId));

    if (tableId && !orderHasSentBill(current)) {
      void releaseTableSessionAction(tableId).then((result) => {
        if (result.error) toast.error(result.error);
      });
    }
  }

  function primaryAction() {
    if (hasDraftToSend) sendToKitchen();
    else if (sessionBill.totalMinor > 0) openCheckout();
  }

  // Prefetch salon while working a table.
  useEffect(() => {
    router.prefetch(salonHref(returnAreaId));
    void warmFloorBoot();
  }, [router, returnAreaId]);

  useEffect(() => {
    if (opening || order.id.startsWith("opening-")) return;
    if (sessionBill.totalMinor <= 0) return;
    void getOrderCheckoutAction(order.id);
  }, [opening, order.id, sessionBill.totalMinor]);

  return (
    <div
      className={cn(
        "-m-4 flex flex-col overflow-hidden bg-background text-foreground",
        "h-[calc(100dvh-5.5rem)] max-h-[calc(100dvh-5.5rem)]",
        "md:-m-6 md:h-[calc(100dvh-4.5rem)] md:max-h-[calc(100dvh-4.5rem)] md:flex-row",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          mobilePhase === "ticket" && "max-md:hidden",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={goToSalon}
            aria-label="Volver al salón"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Salón
          </Button>
          <CatalogSearchField
            className="min-w-0 flex-1"
            value={menuSearchQuery}
            onChange={setMenuSearchQuery}
            onClear={() => setMenuSearchQuery("")}
            inputClassName="h-[var(--control-height-sm)] min-h-0 max-h-full leading-none"
          />
          {sessionBill.totalMinor > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSessionPreviewOpen(true)}
              aria-label={`Cuenta sin cobrar: ${formatCurrency(sessionBill.totalMinor)}`}
            >
              <Receipt className="size-4" aria-hidden />
              <span className="tabular-nums">
                {formatCurrency(sessionBill.totalMinor)}
              </span>
            </Button>
          ) : null}
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Categorías
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {displayCategories.map((cat, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length]!;
              const count = filterMenuProductsByQuery(
                catalog.products.filter(
                  (p) => p.isActive && p.categoryId === cat.id,
                ),
                menuSearchQuery,
                categoryNameById,
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
              {searchActive
                ? "Ningún producto coincide con tu búsqueda."
                : "No hay productos en esta categoría."}
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
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="h-auto w-full flex-col gap-0.5 py-3 font-semibold"
            disabled={
              opening ||
              ticketClosed ||
              ticketItemCount === 0 ||
              order.id.startsWith("opening-")
            }
            onClick={() => setMobilePhase("ticket")}
          >
            <span className="text-sm font-semibold">Continuar</span>
            <span className="text-[11px] font-normal opacity-90">
              {ticketItemCount}{" "}
              {ticketItemCount === 1 ? "producto" : "productos"} ·{" "}
              {formatCurrency(order.totalMinor)}
            </span>
          </Button>
        </div>
      </div>

      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-t border-border bg-card md:min-h-0 md:w-[340px] md:max-h-full md:overflow-hidden md:border-t-0 md:border-l lg:w-[380px]",
          mobilePhase === "menu"
            ? "max-md:hidden"
            : "max-md:fixed max-md:inset-0 max-md:z-50 max-md:flex max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:overflow-hidden max-md:border-0",
        )}
      >
        <div className="shrink-0 border-b border-border px-5 py-5">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 truncate text-2xl font-semibold leading-none tracking-tight">
              {tableLabel}
            </h2>
            {activeReservation ? (
              <PosTableReservationIndicator
                reservation={activeReservation}
                onEdit={() => setReserveDialogOpen(true)}
                onCancel={handleCancelReservation}
                cancelPending={cancelReservationPending}
              />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{attendant}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {!hasDraftToSend ? (
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

        <div className="flex shrink-0 flex-col gap-2 border-t border-border px-5 py-5">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatCurrency(ticketTotals.subtotalMinor)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Impuestos</span>
              <span className="tabular-nums">
                {formatCurrency(ticketTotals.taxMinor)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-base font-medium">Total</span>
              <span className="text-3xl font-semibold tracking-tight tabular-nums leading-none">
                {formatCurrency(ticketTotals.totalMinor)}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full font-semibold"
            disabled={
              opening ||
              order.status === "completed" ||
              order.id.startsWith("opening-") ||
              (hasDraftToSend
                ? false
                : sessionBill.totalMinor === 0)
            }
            loading={opening}
            onClick={primaryAction}
          >
            {hasDraftToSend
              ? "Enviar pedido"
              : `Cobrar ${formatCurrency(sessionBill.totalMinor)}`}
          </Button>
        </div>
      </aside>

      <TableSessionPreviewDialog
        open={sessionPreviewOpen}
        onOpenChange={setSessionPreviewOpen}
        batches={sessionBatches}
        totalMinor={sessionBill.totalMinor}
        canReprintTickets={canPrintTickets}
        reprintDisabled={opening || reprintPending}
        reprintLoading={reprintPending}
        onReprintTickets={reprintTickets}
      />

      <PosCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        order={order}
        tableLabel={tableLabel}
        batches={sessionBatches}
        billSubtotalMinor={sessionBill.subtotalMinor}
        billTaxMinor={sessionBill.taxMinor}
        billTotalMinor={sessionBill.totalMinor}
        onOrderUpdated={setOrder}
        onOrderCompleted={handleCheckoutCompleted}
      />

      <DrinkServeSheet
        product={drinkPickProduct}
        open={drinkSheetOpen}
        onOpenChange={(open) => {
          setDrinkSheetOpen(open);
          if (!open) setDrinkPickProduct(null);
        }}
        onChoose={chooseDrinkTiming}
      />

      <TableReservationDialog
        tables={tableForReserve ? [tableForReserve] : []}
        open={reserveDialogOpen}
        onOpenChange={setReserveDialogOpen}
        onReserved={(updated) =>
          setActiveReservation(updated[0]?.reservation ?? null)
        }
        onReserveFailed={() => {
          setActiveReservation(tableReservation ?? null);
          refreshFloorBootInBackground();
        }}
      />
    </div>
  );
}
