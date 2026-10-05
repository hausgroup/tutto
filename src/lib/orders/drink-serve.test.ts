import { describe, expect, it } from "vitest";
import {
  applyOptimisticMoveBarUnitToWithMeal,
  applyOptimisticQuantityDelta,
} from "@/lib/orders/optimistic";
import {
  canMoveBarUnitToWithMeal,
  catalogProductIsPosBarDrink,
  categoryNameIsPosBarDrink,
  orderItemServeHint,
  resolveServeTiming,
  linesMatchForQuantityAdjust,
} from "@/lib/orders/drink-serve";
import type { CatalogSnapshot, ProductCategory } from "@/lib/catalog/types";
import type { Order, OrderItem } from "@/lib/orders/types";

const categories: ProductCategory[] = [
  {
    id: "cat-cocktails",
    name: "Cocktails",
    restaurantId: "r1",
    sortOrder: 1,
    isActive: true,
    preparationStation: "bar",
  },
  {
    id: "cat-kitchen",
    name: "Platos",
    restaurantId: "r1",
    sortOrder: 2,
    isActive: true,
    preparationStation: "kitchen",
  },
];

function barItem(
  overrides: Partial<OrderItem> = {},
): OrderItem {
  return {
    id: "i1",
    orderId: "o1",
    productId: "p1",
    productName: "Mojito",
    quantity: 1,
    unitPriceMinor: 1000,
    taxRateBps: 0,
    lineSubtotalMinor: 1000,
    lineTaxMinor: 0,
    lineTotalMinor: 1000,
    status: "sent",
    preparationStation: "bar",
    serveTiming: "immediate",
    notes: null,
    modifiers: [],
    ...overrides,
  };
}

function orderWith(items: OrderItem[]): Order {
  return {
    id: "o1",
    restaurantId: "r1",
    tableId: "t1",
    tableLabel: "1",
    orderNumber: 1,
    status: "in_progress",
    subtotalMinor: items.reduce((s, i) => s + i.lineSubtotalMinor, 0),
    taxMinor: 0,
    discountMinor: 0,
    totalMinor: items.reduce((s, i) => s + i.lineTotalMinor, 0),
    notes: null,
    openedAt: new Date().toISOString(),
    closedAt: null,
    items,
  };
}

describe("categoryNameIsPosBarDrink", () => {
  it("matches bebidas and cocktails", () => {
    expect(categoryNameIsPosBarDrink("Bebidas")).toBe(true);
    expect(categoryNameIsPosBarDrink("Cocktails")).toBe(true);
    expect(categoryNameIsPosBarDrink("Platos")).toBe(false);
  });
});

describe("resolveServeTiming", () => {
  it("defaults category drinks to immediate", () => {
    expect(
      resolveServeTiming(
        {
          preparationStation: "kitchen",
          categoryId: "cat-cocktails",
        },
        categories,
      ),
    ).toBe("immediate");
  });
});

describe("canMoveBarUnitToWithMeal", () => {
  it("allows kitchen-station lines in cocktail category", () => {
    expect(
      canMoveBarUnitToWithMeal(
        barItem({
          preparationStation: "kitchen",
          serveTiming: null,
          status: "pending",
        }),
        { preparationStation: "kitchen", categoryId: "cat-cocktails" },
        categories,
      ),
    ).toBe(true);
  });

  it("blocks with-meal lines", () => {
    expect(
      canMoveBarUnitToWithMeal(
        barItem({ serveTiming: "with_meal", status: "pending" }),
        { preparationStation: "bar", categoryId: "cat-cocktails" },
        categories,
      ),
    ).toBe(false);
  });
});

describe("catalogProductIsPosBarDrink", () => {
  it("uses category when station is kitchen", () => {
    expect(
      catalogProductIsPosBarDrink(
        { preparationStation: "kitchen", categoryId: "cat-cocktails" },
        categories,
      ),
    ).toBe(true);
  });
});

describe("applyOptimisticQuantityDelta", () => {
  it("merges bar adds into one sent line", () => {
    const catalog: CatalogSnapshot = {
      categories,
      products: [
        {
          id: "p1",
          restaurantId: "r1",
          categoryId: "cat-cocktails",
          name: "Mojito",
          description: null,
          sku: null,
          priceMinor: 1000,
          costMinor: 0,
          taxRateBps: 0,
          isActive: true,
          trackInventory: false,
          preparationStation: "kitchen",
        },
      ],
      modifiers: [],
    };
    let order = orderWith([]);
    order = applyOptimisticQuantityDelta(order, catalog, "p1", 1, "immediate");
    order = applyOptimisticQuantityDelta(order, catalog, "p1", 1, "immediate");
    order = applyOptimisticQuantityDelta(order, catalog, "p1", 1, "immediate");
    expect(order.items).toHaveLength(1);
    expect(order.items[0]?.quantity).toBe(3);
    expect(order.items[0]?.status).toBe("pending");
  });
});

describe("linesMatchForQuantityAdjust", () => {
  it("allows removing sent with-meal lines", () => {
    expect(
      linesMatchForQuantityAdjust(
        barItem({ serveTiming: "with_meal", status: "sent" }),
        "p1",
        "with_meal",
        -1,
      ),
    ).toBe(true);
  });
});

describe("applyOptimisticMoveBarUnitToWithMeal", () => {
  it("moves one unit from a multi-qty line", () => {
    const source = barItem({ id: "beer", quantity: 3, lineTotalMinor: 3000 });
    const catalog: CatalogSnapshot = {
      categories,
      products: [
        {
          id: "p1",
          restaurantId: "r1",
          categoryId: "cat-cocktails",
          name: "Mojito",
          description: null,
          sku: null,
          priceMinor: 1000,
          costMinor: 0,
          taxRateBps: 0,
          isActive: true,
          trackInventory: false,
          preparationStation: "kitchen",
        },
      ],
      modifiers: [],
    };
    const next = applyOptimisticMoveBarUnitToWithMeal(
      orderWith([source]),
      "beer",
      catalog,
    );
    const immediate = next.items.find((i) => i.id === "beer");
    const withMeal = next.items.find((i) => i.serveTiming === "with_meal");
    expect(immediate?.quantity).toBe(2);
    expect(withMeal?.quantity).toBe(1);
  });
});
