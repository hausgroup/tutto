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
  it("flags undelivered with-meal bar lines", () => {
    expect(
      itemHasPendingBarDelivery(
        barItem({ status: "sent", serveTiming: "with_meal" }),
      ),
    ).toBe(true);
    expect(
      itemHasPendingBarDelivery(
        barItem({ status: "ready", serveTiming: "with_meal" }),
      ),
    ).toBe(true);
  });

  it("ignores enseguida bar lines", () => {
    expect(
      itemHasPendingBarDelivery(
        barItem({ status: "sent", serveTiming: "immediate" }),
      ),
    ).toBe(false);
  });

  it("ignores delivered, cancelled, and kitchen lines", () => {
    expect(
      itemHasPendingBarDelivery(
        barItem({ status: "delivered", serveTiming: "with_meal" }),
      ),
    ).toBe(false);
    expect(
      itemHasPendingBarDelivery(
        barItem({ status: "pending", serveTiming: "with_meal" }),
      ),
    ).toBe(false);
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
        items: [
          barItem({ serveTiming: "with_meal" }),
          barItem({ preparationStation: "kitchen" }),
        ],
      }),
    ).toBe(true);
    expect(
      orderHasPendingBarDrinks({
        items: [barItem({ status: "delivered", serveTiming: "with_meal" })],
      }),
    ).toBe(false);
  });
});
