import { calculateLineItem, sumOrderTotals } from "@/lib/orders/calculate";
import type { CatalogSnapshot } from "@/lib/catalog/types";
import {
  canMoveBarUnitToWithMeal,
  catalogProductIsPosBarDrink,
  deriveOrderStatusFromItems,
  findWithMealLineToMerge,
  initialItemStatusForServeTiming,
  linesMatchForQuantityAdjust,
  pendingLinesMatch,
  resolveServeTiming,
} from "@/lib/orders/drink-serve";
import { consolidateWithMealOrderLines } from "@/lib/orders/consolidate-lines";
import type { DrinkServeTiming, Order, OrderItem } from "@/lib/orders/types";

function dedupeOrderItemsById(items: OrderItem[]): OrderItem[] {
  const byId = new Map<string, OrderItem>();
  for (const item of items) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

function withRecalculatedTotals(order: Order): Order {
  const totals = sumOrderTotals(
    order.items.map((item) => ({
      lineSubtotalMinor: item.lineSubtotalMinor,
      lineTaxMinor: item.lineTaxMinor,
      lineTotalMinor: item.lineTotalMinor,
    })),
  );
  return {
    ...order,
    subtotalMinor: totals.subtotalMinor,
    taxMinor: totals.taxMinor,
    totalMinor: totals.totalMinor - order.discountMinor,
  };
}

function recalcLine(item: OrderItem, quantity: number): OrderItem {
  const line = calculateLineItem({
    unitPriceMinor: item.unitPriceMinor,
    quantity,
    taxRateBps: item.taxRateBps,
    modifierDeltaMinor: item.modifiers.reduce(
      (sum, m) => sum + m.priceMinorDelta,
      0,
    ),
  });
  return {
    ...item,
    quantity,
    lineSubtotalMinor: line.lineSubtotalMinor,
    lineTaxMinor: line.lineTaxMinor,
    lineTotalMinor: line.lineTotalMinor,
  };
}

/** Instant client-side quantity change while the server catches up. */
export function applyOptimisticQuantityDelta(
  order: Order,
  catalog: CatalogSnapshot,
  productId: string,
  delta: number,
  serveTiming?: DrinkServeTiming,
): Order {
  if (delta === 0 || order.status === "completed") return order;

  const items = [...order.items];
  const product = catalog.products.find((p) => p.id === productId);
  const resolvedTiming = product
    ? resolveServeTiming(product, catalog.categories, serveTiming)
    : null;

  const pendingIndex = items.findIndex((item) =>
    linesMatchForQuantityAdjust(item, productId, resolvedTiming, delta),
  );

  if (delta > 0) {
    if (pendingIndex >= 0) {
      const current = items[pendingIndex]!;
      items[pendingIndex] = recalcLine(current, current.quantity + delta);
    } else {
      if (!product) return order;
      const line = calculateLineItem({
        unitPriceMinor: product.priceMinor,
        quantity: delta,
        taxRateBps: product.taxRateBps,
      });
      const status = initialItemStatusForServeTiming(
        resolvedTiming,
        catalogProductIsPosBarDrink(product, catalog.categories),
      );
      items.push({
        id: `optimistic-${productId}-${Date.now()}`,
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        quantity: delta,
        unitPriceMinor: product.priceMinor,
        taxRateBps: product.taxRateBps,
        lineSubtotalMinor: line.lineSubtotalMinor,
        lineTaxMinor: line.lineTaxMinor,
        lineTotalMinor: line.lineTotalMinor,
        status,
        preparationStation: product.preparationStation,
        serveTiming: resolvedTiming,
        notes: null,
        modifiers: [],
      });
    }
    return withRecalculatedTotals({
      ...order,
      items: dedupeOrderItemsById(
        consolidateWithMealOrderLines(items),
      ),
      status: "open",
    });
  }

  let remaining = Math.abs(delta);
  for (let i = 0; i < items.length && remaining > 0; i++) {
    const item = items[i]!;
    if (!linesMatchForQuantityAdjust(item, productId, resolvedTiming, delta)) {
      continue;
    }
    if (item.quantity <= remaining) {
      remaining -= item.quantity;
      items.splice(i, 1);
      i -= 1;
    } else {
      items[i] = recalcLine(item, item.quantity - remaining);
      remaining = 0;
    }
  }

  return withRecalculatedTotals({
    ...order,
    items: dedupeOrderItemsById(items),
  });
}

/** Move one immediate bar unit into the with-meal group (client-side). */
export function applyOptimisticMoveBarUnitToWithMeal(
  order: Order,
  itemId: string,
  catalog: CatalogSnapshot,
): Order {
  const items = [...order.items];
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  if (sourceIndex < 0) return order;

  const source = items[sourceIndex]!;
  const product = catalog.products.find((p) => p.id === source.productId);
  if (!canMoveBarUnitToWithMeal(source, product, catalog.categories)) {
    return order;
  }

  const modifierDelta = source.modifiers.reduce(
    (sum, m) => sum + m.priceMinorDelta,
    0,
  );

  if (source.quantity === 1) {
    items.splice(sourceIndex, 1);
  } else {
    items[sourceIndex] = recalcLine(source, source.quantity - 1);
  }

  const mealLine = findWithMealLineToMerge(items, source.productId);
  if (mealLine) {
    const mealIndex = items.findIndex((item) => item.id === mealLine.id);
    if (mealIndex >= 0) {
      items[mealIndex] = recalcLine(items[mealIndex]!, mealLine.quantity + 1);
    }
  } else {
    const line = calculateLineItem({
      unitPriceMinor: source.unitPriceMinor,
      quantity: 1,
      taxRateBps: source.taxRateBps,
      modifierDeltaMinor: modifierDelta,
    });
    items.push({
      id: `optimistic-meal-${source.productId}-${Date.now()}`,
      orderId: order.id,
      productId: source.productId,
      productName: source.productName,
      quantity: 1,
      unitPriceMinor: source.unitPriceMinor,
      taxRateBps: source.taxRateBps,
      lineSubtotalMinor: line.lineSubtotalMinor,
      lineTaxMinor: line.lineTaxMinor,
      lineTotalMinor: line.lineTotalMinor,
      status: "pending",
      preparationStation: source.preparationStation,
      serveTiming: "with_meal",
      notes: source.notes,
      modifiers: source.modifiers.map((m) => ({ ...m })),
    });
  }

  return withRecalculatedTotals({
    ...order,
    items: dedupeOrderItemsById(consolidateWithMealOrderLines(items)),
    status: deriveOrderStatusFromItems(items, order.status),
  });
}

/** After server sync, trust server lines (deduped) to avoid duplicate rows. */
export function mergeServerOrderItems(local: Order, server: Order): Order {
  const byId = new Map<string, OrderItem>();
  for (const item of server.items) {
    byId.set(item.id, item);
  }
  return {
    ...local,
    items: consolidateWithMealOrderLines([...byId.values()]),
    subtotalMinor: server.subtotalMinor,
    taxMinor: server.taxMinor,
    totalMinor: server.totalMinor,
    status: server.status,
  };
}
