import type { OrderItem } from "@/lib/orders/types";

/** Active lines that should appear on kitchen/bar station tickets. */
export function selectOrderItemsForStationTickets(
  items: OrderItem[],
): OrderItem[] {
  return items.filter(
    (item) => item.status !== "cancelled" && item.quantity > 0,
  );
}
