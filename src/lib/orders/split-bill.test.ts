import { describe, expect, it } from "vitest";
import { defaultGuests, totalsByGuest } from "@/lib/orders/split-bill";
import type { OrderItem } from "@/lib/orders/types";

function item(
  id: string,
  productName: string,
  lineTotalMinor: number,
): OrderItem {
  return {
    id,
    orderId: "o1",
    productId: "p1",
    productName,
    quantity: 1,
    unitPriceMinor: lineTotalMinor,
    taxRateBps: 0,
    lineSubtotalMinor: lineTotalMinor,
    lineTaxMinor: 0,
    lineTotalMinor,
    status: "sent",
    preparationStation: "kitchen",
    serveTiming: null,
    notes: null,
    modifiers: [],
    sentAt: "2026-01-01T12:00:00.000Z",
  };
}

describe("split bill totals", () => {
  it("assigns unassigned lines to the first guest", () => {
    const guests = defaultGuests(2);
    const items = [item("a", "Burger", 10000), item("b", "Fries", 5000)];
    const rows = totalsByGuest(items, guests, { a: guests[1]!.id });
    expect(rows[0]?.totalMinor).toBe(5000);
    expect(rows[1]?.totalMinor).toBe(10000);
  });
});
