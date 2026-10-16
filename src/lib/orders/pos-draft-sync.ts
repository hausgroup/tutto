import type { CatalogSnapshot } from "@/lib/catalog/types";
import {
  consolidateEnseguidaPendingLines,
  consolidateWithMealOrderLines,
} from "@/lib/orders/consolidate-lines";
import { filterDraftItems } from "@/lib/orders/bill-segments";
import { resolveServeTiming } from "@/lib/orders/drink-serve";
import { recalculateOrderBillTotals } from "@/lib/orders/bill-segments";
import { deriveOrderStatusFromItems } from "@/lib/orders/drink-serve";
import type { DrinkServeTiming, Order } from "@/lib/orders/types";

export type PosPendingDraftLine = {
  productId: string;
  quantity: number;
  serveTiming?: DrinkServeTiming | null;
};

/** Coalesced pending draft lines ready to persist on send. */
export function pendingDraftLinesFromOrder(
  order: Order,
  catalog: CatalogSnapshot,
): PosPendingDraftLine[] {
  const items = consolidateEnseguidaPendingLines(
    consolidateWithMealOrderLines(filterDraftItems(order.items)),
  );
  const merged = new Map<string, PosPendingDraftLine>();
  for (const item of items) {
    const product = catalog.products.find((p) => p.id === item.productId);
    const timing = product
      ? resolveServeTiming(
          product,
          catalog.categories,
          item.serveTiming ?? undefined,
        )
      : item.serveTiming;
    const key = `${item.productId}|${timing ?? ""}`;
    const prev = merged.get(key);
    if (prev) {
      prev.quantity += item.quantity;
    } else {
      merged.set(key, {
        productId: item.productId,
        quantity: item.quantity,
        serveTiming: timing,
      });
    }
  }
  return [...merged.values()].filter((line) => line.quantity > 0);
}

/** Instant UI while the server persists the send in the background. */
export function applyOptimisticSendOrder(order: Order): Order {
  const sentAt = new Date().toISOString();
  const items = order.items.map((item) =>
    item.status === "pending"
      ? { ...item, status: "sent" as const, sentAt }
      : item,
  );
  const next: Order = {
    ...order,
    items,
    status: deriveOrderStatusFromItems(items, order.status),
  };
  recalculateOrderBillTotals(next);
  return next;
}
