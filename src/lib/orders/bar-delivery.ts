import type { Order, OrderItem } from "@/lib/orders/types";

/** Salón badge: bar drinks marked “con la comida” sent but not yet at the table. */
export function orderHasPendingBarDrinks(order: Pick<Order, "items">): boolean {
  return order.items.some(itemHasPendingBarDelivery);
}

export function itemHasPendingBarDelivery(
  item: Pick<
    OrderItem,
    "preparationStation" | "status" | "quantity" | "serveTiming"
  >,
): boolean {
  if (item.quantity <= 0) return false;
  if (item.serveTiming !== "with_meal") return false;
  if (item.status === "cancelled" || item.status === "delivered") return false;
  if (item.preparationStation !== "bar") return false;
  // Draft lines stay off the badge until the order is sent.
  if (item.status === "pending") return false;
  return true;
}

export function orderItemIdsPendingWithMealBarDelivery(
  items: OrderItem[],
): string[] {
  return items
    .filter((item) => itemHasPendingBarDelivery(item))
    .map((item) => item.id);
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
