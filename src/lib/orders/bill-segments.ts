import { sumOrderTotals } from "@/lib/orders/calculate";
import type { Order, OrderItem } from "@/lib/orders/types";

export function isDraftOrderItem(item: OrderItem): boolean {
  return item.status === "pending" && item.quantity > 0;
}

/** Sent to kitchen/bar, not yet paid (delivered). */
export function isUnpaidSentOrderItem(item: OrderItem): boolean {
  if (item.status === "cancelled" || item.quantity <= 0) return false;
  return (
    item.status === "sent" ||
    item.status === "in_progress" ||
    item.status === "ready"
  );
}

export function orderHasSentBill(order: Order): boolean {
  return order.items.some(isUnpaidSentOrderItem);
}

export function orderHasAnyActiveItems(order: Order): boolean {
  return order.items.some(
    (item) => item.status !== "cancelled" && item.quantity > 0,
  );
}

export function filterDraftItems(items: OrderItem[]): OrderItem[] {
  return items.filter(isDraftOrderItem);
}

export function filterUnpaidSentItems(items: OrderItem[]): OrderItem[] {
  return items.filter(isUnpaidSentOrderItem);
}

export function sumItemLinesTotals(items: OrderItem[]) {
  return sumOrderTotals(
    items.map((item) => ({
      lineSubtotalMinor: item.lineSubtotalMinor,
      lineTaxMinor: item.lineTaxMinor,
      lineTotalMinor: item.lineTotalMinor,
    })),
  );
}

export function unpaidSentBillTotals(order: Order) {
  const totals = sumItemLinesTotals(filterUnpaidSentItems(order.items));
  return {
    subtotalMinor: totals.subtotalMinor,
    taxMinor: totals.taxMinor,
    totalMinor: totals.totalMinor - order.discountMinor,
  };
}

export function draftTicketTotals(order: Order) {
  return sumItemLinesTotals(filterDraftItems(order.items));
}

export type TableSessionSendBatch = {
  sentAt: string | null;
  items: OrderItem[];
  totalMinor: number;
};

export function groupUnpaidSentItemsBySend(
  items: OrderItem[],
): TableSessionSendBatch[] {
  const sent = filterUnpaidSentItems(items);
  const groups = new Map<string, OrderItem[]>();

  for (const item of sent) {
    const key = item.sentAt ?? "legacy";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([key, batchItems]) => ({
      sentAt: key === "legacy" ? null : key,
      items: batchItems,
      totalMinor: sumItemLinesTotals(batchItems).totalMinor,
    }))
    .sort((a, b) => {
      const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return tb - ta;
    });
}

export function recalculateOrderBillTotals(order: Order): void {
  const totals = unpaidSentBillTotals(order);
  order.subtotalMinor = totals.subtotalMinor;
  order.taxMinor = totals.taxMinor;
  order.totalMinor = totals.totalMinor;
}
