import { describe, expect, it } from "vitest";
import {
  resolvePrintStationForItem,
  splitOrderItemsByPrintStation,
} from "@/lib/printing/station-routing";
import type { OrderItem } from "@/lib/orders/types";

const categories = [
  { id: "cat-food", name: "Platos", restaurantId: "r1", sortOrder: 1, isActive: true },
  { id: "cat-bar", name: "Cocktails", restaurantId: "r1", sortOrder: 2, isActive: true },
];

function item(
  overrides: Partial<OrderItem> & Pick<OrderItem, "productId" | "productName">,
): OrderItem {
  return {
    id: overrides.id ?? "i1",
    orderId: "o1",
    quantity: 1,
    unitPriceMinor: 1000,
    taxRateBps: 0,
    lineSubtotalMinor: 1000,
    lineTaxMinor: 0,
    lineTotalMinor: 1000,
    status: "pending",
    preparationStation: "kitchen",
    serveTiming: null,
    notes: null,
    modifiers: [],
    ...overrides,
  };
}

describe("resolvePrintStationForItem", () => {
  it("routes cocktail category to bar even when station is kitchen", () => {
    expect(
      resolvePrintStationForItem(
        item({ productId: "p1", productName: "Mojito", preparationStation: "kitchen" }),
        { categoryId: "cat-bar", preparationStation: "kitchen" },
        categories,
      ),
    ).toBe("bar");
  });

  it("routes food to kitchen", () => {
    expect(
      resolvePrintStationForItem(
        item({ productId: "p2", productName: "Pasta", preparationStation: "kitchen" }),
        { categoryId: "cat-food", preparationStation: "kitchen" },
        categories,
      ),
    ).toBe("kitchen");
  });
});

describe("splitOrderItemsByPrintStation", () => {
  it("splits mixed tickets", () => {
    const split = splitOrderItemsByPrintStation(
      [
        item({ id: "1", productId: "p2", productName: "Pasta" }),
        item({
          id: "2",
          productId: "p1",
          productName: "Mojito",
          serveTiming: "with_meal",
        }),
      ],
      {
        categories,
        products: [
          { id: "p1", categoryId: "cat-bar", preparationStation: "kitchen" },
          { id: "p2", categoryId: "cat-food", preparationStation: "kitchen" },
        ],
      },
    );
    expect(split.kitchen).toHaveLength(1);
    expect(split.bar).toHaveLength(1);
  });
});
