import { describe, expect, it } from "vitest";
import { applyOptimisticQuantityDelta } from "@/lib/orders/optimistic";
import type { CatalogSnapshot } from "@/lib/catalog/types";
import type { Order } from "@/lib/orders/types";

const catalog: CatalogSnapshot = {
  categories: [],
  modifiers: [],
  products: [
    {
      id: "p1",
      restaurantId: "r1",
      categoryId: null,
      name: "Burger",
      description: null,
      sku: null,
      priceMinor: 10000,
      costMinor: 3000,
      taxRateBps: 0,
      isActive: true,
      trackInventory: false,
      preparationStation: "kitchen",
    },
  ],
};

const emptyOrder: Order = {
  id: "o1",
  restaurantId: "r1",
  tableId: "t1",
  tableLabel: "A1",
  orderNumber: 1,
  status: "open",
  subtotalMinor: 0,
  taxMinor: 0,
  discountMinor: 0,
  totalMinor: 0,
  notes: null,
  openedAt: new Date().toISOString(),
  closedAt: null,
  items: [],
};

describe("optimistic quantity", () => {
  it("adds a pending line on plus", () => {
    const next = applyOptimisticQuantityDelta(emptyOrder, catalog, "p1", 1);
    expect(next.items).toHaveLength(1);
    expect(next.items[0]?.quantity).toBe(1);
    expect(next.totalMinor).toBe(10000);
  });

  it("increments and decrements the same pending line", () => {
    const once = applyOptimisticQuantityDelta(emptyOrder, catalog, "p1", 2);
    const twice = applyOptimisticQuantityDelta(once, catalog, "p1", 1);
    expect(twice.items[0]?.quantity).toBe(3);
    const down = applyOptimisticQuantityDelta(twice, catalog, "p1", -1);
    expect(down.items[0]?.quantity).toBe(2);
    const cleared = applyOptimisticQuantityDelta(down, catalog, "p1", -2);
    expect(cleared.items).toHaveLength(0);
    expect(cleared.totalMinor).toBe(0);
  });
});
