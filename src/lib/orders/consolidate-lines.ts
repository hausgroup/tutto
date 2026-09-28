import { calculateLineItem } from "@/lib/orders/calculate";
import type { OrderItem } from "@/lib/orders/types";

function modifierKey(item: OrderItem): string {
  return item.modifiers
    .map((m) => m.id)
    .sort()
    .join("|");
}

/** Groups equivalent with-meal lines (same product, price, mods, status). */
export function withMealLineMergeKey(item: OrderItem): string | null {
  if (item.serveTiming !== "with_meal") return null;
  if (item.status === "cancelled" || item.quantity <= 0) return null;
  return `${item.productId}|${item.status}|${item.unitPriceMinor}|${modifierKey(item)}`;
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

/** Merge duplicate with-meal rows into one line per product (same status). */
export function consolidateWithMealOrderLines(items: OrderItem[]): OrderItem[] {
  const result: OrderItem[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of items) {
    const key = withMealLineMergeKey(item);
    if (!key) {
      result.push(item);
      continue;
    }
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, result.length);
      result.push({ ...item });
      continue;
    }
    const existing = result[existingIndex]!;
    result[existingIndex] = recalcLine(
      existing,
      existing.quantity + item.quantity,
    );
  }

  return result;
}
