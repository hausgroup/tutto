import type { Order, OrderItem } from "@/lib/orders/types";

/** Bar lines still waiting to reach the table (not cancelled / delivered). */
export function orderHasPendingBarDrinks(order: Pick<Order, "items">): boolean {
  return order.items.some(itemHasPendingBarDelivery);
}

export function itemHasPendingBarDelivery(
  item: Pick<OrderItem, "preparationStation" | "status" | "quantity">,
): boolean {
  if (item.quantity <= 0) return false;
  if (item.status === "cancelled" || item.status === "delivered") return false;
  if (item.preparationStation !== "bar") return false;
  // With-meal drinks stay off the salón badge until sent to the bar.
  if (item.status === "pending") return false;
  return true;
}

export function pendingBarDrinksByTableFromOrders(
  orders: (Pick<Order, "tableId" | "status" | "items">)[],
): Record<string, true> {
  const result: Record<string, true> = {};
  for (const order of orders) {
    if (
      !order.tableId ||
      order.status === "completed" ||
      order.status === "voided"
    ) {
      continue;
    }
    if (orderHasPendingBarDrinks(order)) {
      result[order.tableId] = true;
    }
  }
  return result;
}
