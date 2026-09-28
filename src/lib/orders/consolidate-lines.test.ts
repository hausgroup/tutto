import { describe, expect, it } from "vitest";
import { consolidateWithMealOrderLines } from "@/lib/orders/consolidate-lines";
import type { OrderItem } from "@/lib/orders/types";

function mealLine(id: string, qty: number): OrderItem {
  return {
    id,
    orderId: "o1",
    productId: "p1",
    productName: "Dirty Martini",
    quantity: qty,
    unitPriceMinor: 1000,
    taxRateBps: 0,
    lineSubtotalMinor: 1000 * qty,
    lineTaxMinor: 0,
    lineTotalMinor: 1000 * qty,
    status: "pending",
    preparationStation: "bar",
    serveTiming: "with_meal",
    notes: null,
    modifiers: [],
  };
}

describe("consolidateWithMealOrderLines", () => {
  it("merges duplicate with-meal lines for the same product", () => {
    const merged = consolidateWithMealOrderLines([
      mealLine("a", 1),
      mealLine("b", 1),
      {
        ...mealLine("c", 1),
        productId: "p2",
        productName: "Other",
      },
    ]);
    expect(merged).toHaveLength(2);
    const martini = merged.find((i) => i.productId === "p1");
    expect(martini?.quantity).toBe(2);
  });
});
