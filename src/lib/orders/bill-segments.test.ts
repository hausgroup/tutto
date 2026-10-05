import { describe, expect, it } from "vitest";
import {
  draftTicketTotals,
  groupUnpaidSentItemsBySend,
  orderHasSentBill,
  unpaidSentBillTotals,
} from "@/lib/orders/bill-segments";
import type { OrderItem } from "@/lib/orders/types";

function item(partial: Partial<OrderItem> & Pick<OrderItem, "status">): OrderItem {
  return {
    id: partial.id ?? "1",
    orderId: "o1",
    productId: "p1",
    productName: "Test",
    quantity: partial.quantity ?? 1,
    unitPriceMinor: 10000,
    taxRateBps: 0,
    lineSubtotalMinor: 10000,
    lineTaxMinor: 0,
    lineTotalMinor: 10000,
    preparationStation: "kitchen",
    serveTiming: null,
    notes: null,
    modifiers: [],
    ...partial,
  };
}

describe("bill-segments", () => {
  it("occupies table only when sent lines exist", () => {
    const pendingOnly = [item({ status: "pending" })];
    const sent = [item({ status: "sent", sentAt: "2026-01-01T12:00:00.000Z" })];
    expect(orderHasSentBill({ items: pendingOnly } as never)).toBe(false);
    expect(orderHasSentBill({ items: sent } as never)).toBe(true);
  });

  it("groups sends by timestamp", () => {
    const batches = groupUnpaidSentItemsBySend([
      item({
        id: "a",
        status: "sent",
        sentAt: "2026-01-01T12:00:00.000Z",
      }),
      item({
        id: "b",
        status: "sent",
        sentAt: "2026-01-01T12:05:00.000Z",
      }),
    ]);
    expect(batches).toHaveLength(2);
    expect(batches[0]?.sentAt).toBe("2026-01-01T12:05:00.000Z");
  });

  it("draft totals ignore sent lines", () => {
    const order = {
      discountMinor: 0,
      items: [
        item({ id: "1", status: "pending", lineTotalMinor: 5000 }),
        item({
          id: "2",
          status: "sent",
          lineTotalMinor: 9000,
          sentAt: "2026-01-01T12:00:00.000Z",
        }),
      ],
    };
    expect(draftTicketTotals(order as never).totalMinor).toBe(5000);
    expect(unpaidSentBillTotals(order as never).totalMinor).toBe(9000);
  });
});
