import { describe, expect, it } from "vitest";
import {
  itemHasPendingBarDelivery,
  orderHasPendingBarDrinks,
} from "@/lib/orders/bar-delivery";
import type { OrderItem } from "@/lib/orders/types";

function barItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: "1",
    orderId: "o1",
    productId: "p1",
    productName: "Cerveza",
    quantity: 1,
    unitPriceMinor: 1000,
    taxRateBps: 800,
    lineSubtotalMinor: 1000,
    lineTaxMinor: 80,
    lineTotalMinor: 1080,
    status: "sent",
    preparationStation: "bar",
    serveTiming: "immediate",
    notes: null,
    modifiers: [],
    ...overrides,
  };
}

describe("itemHasPendingBarDelivery", () => {
  it("flags undelivered bar lines", () => {
    expect(itemHasPendingBarDelivery(barItem({ status: "sent" }))).toBe(true);
    expect(itemHasPendingBarDelivery(barItem({ status: "ready" }))).toBe(true);
  });

  it("ignores delivered, cancelled, and kitchen lines", () => {
    expect(itemHasPendingBarDelivery(barItem({ status: "delivered" }))).toBe(
      false,
    );
    expect(itemHasPendingBarDelivery(barItem({ status: "pending" }))).toBe(
      false,
    );
    expect(itemHasPendingBarDelivery(barItem({ status: "cancelled" }))).toBe(
      false,
    );
    expect(
      itemHasPendingBarDelivery(
        barItem({ preparationStation: "kitchen", status: "sent" }),
      ),
    ).toBe(false);
  });
});

describe("orderHasPendingBarDrinks", () => {
  it("detects when any bar item is outstanding", () => {
    expect(
      orderHasPendingBarDrinks({
        items: [barItem(), barItem({ preparationStation: "kitchen" })],
      }),
    ).toBe(true);
    expect(
      orderHasPendingBarDrinks({
        items: [barItem({ status: "delivered" })],
      }),
    ).toBe(false);
  });
});
