import { describe, expect, it } from "vitest";
import {
  applyOptimisticMoveBarUnitToWithMeal,
  applyOptimisticQuantityDelta,
  applyOptimisticRemoveOrderLine,
  reconcileOrderAfterServer,
} from "@/lib/orders/optimistic";
import type { CatalogSnapshot } from "@/lib/catalog/types";
import type { Order, OrderItem } from "@/lib/orders/types";

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
      preparationStation: "bar",
    },
    {
      id: "p-drink",
      restaurantId: "r1",
      categoryId: null,
      name: "Mojito",
      description: null,
      sku: null,
      priceMinor: 12000,
      costMinor: 0,
      taxRateBps: 0,
      isActive: true,
      trackInventory: false,
      preparationStation: "bar",
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
    expect(next.totalMinor).toBe(0);
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

  it("reuses one optimistic row for rapid taps on the same drink", () => {
    const barCatalog: CatalogSnapshot = {
      categories: [
        {
          id: "cat-bar",
          restaurantId: "r1",
          name: "Cócteles",
          sortOrder: 0,
          isActive: true,
          preparationStation: "bar",
        },
      ],
      modifiers: [],
      products: [catalog.products.find((p) => p.id === "p-drink")!],
    };
    let order = emptyOrder;
    order = applyOptimisticQuantityDelta(
      order,
      barCatalog,
      "p-drink",
      1,
      "immediate",
    );
    order = applyOptimisticQuantityDelta(
      order,
      barCatalog,
      "p-drink",
      1,
      "immediate",
    );
    const pending = order.items.filter((i) => i.status === "pending");
    expect(pending).toHaveLength(1);
    expect(pending[0]?.quantity).toBe(2);
  });
});

describe("reconcileOrderAfterServer", () => {
  it("uses server qty when nothing is still queued", () => {
    const serverLine: OrderItem = {
      id: "server-line-1",
      orderId: "o1",
      productId: "p-drink",
      productName: "Mojito",
      quantity: 3,
      unitPriceMinor: 12000,
      taxRateBps: 0,
      lineSubtotalMinor: 36000,
      lineTaxMinor: 0,
      lineTotalMinor: 36000,
      status: "pending",
      preparationStation: "bar",
      serveTiming: "immediate",
      notes: null,
      modifiers: [],
    };
    const server: Order = { ...emptyOrder, items: [serverLine] };
    const merged = reconcileOrderAfterServer(server, catalog, []);
    expect(merged.items[0]?.quantity).toBe(3);
  });

  it("re-applies outbound queue deltas on top of server snapshot", () => {
    const serverLine: OrderItem = {
      id: "server-line-1",
      orderId: "o1",
      productId: "p-drink",
      productName: "Mojito",
      quantity: 3,
      unitPriceMinor: 12000,
      taxRateBps: 0,
      lineSubtotalMinor: 36000,
      lineTaxMinor: 0,
      lineTotalMinor: 36000,
      status: "pending",
      preparationStation: "bar",
      serveTiming: "immediate",
      notes: null,
      modifiers: [],
    };
    const server: Order = { ...emptyOrder, items: [serverLine] };
    const merged = reconcileOrderAfterServer(server, catalog, [
      { productId: "p-drink", delta: 2, serveTiming: "immediate" },
    ]);
    expect(merged.items[0]?.quantity).toBe(5);
  });

  it("preserves comida split from server after move", () => {
    const barCatalog: CatalogSnapshot = {
      categories: [
        {
          id: "cat-bar",
          restaurantId: "r1",
          name: "Cócteles",
          sortOrder: 0,
          isActive: true,
          preparationStation: "bar",
        },
      ],
      modifiers: [],
      products: [catalog.products.find((p) => p.id === "p-drink")!],
    };
    const enseguida: OrderItem = {
      id: "line-a",
      orderId: "o1",
      productId: "p-drink",
      productName: "Mojito",
      quantity: 9,
      unitPriceMinor: 12000,
      taxRateBps: 0,
      lineSubtotalMinor: 108000,
      lineTaxMinor: 0,
      lineTotalMinor: 108000,
      status: "pending",
      preparationStation: "bar",
      serveTiming: "immediate",
      notes: null,
      modifiers: [],
    };
    const comida: OrderItem = {
      ...enseguida,
      id: "line-b",
      quantity: 1,
      serveTiming: "with_meal",
      lineSubtotalMinor: 12000,
      lineTotalMinor: 12000,
    };
    const server: Order = { ...emptyOrder, items: [enseguida, comida] };
    const merged = reconcileOrderAfterServer(server, barCatalog, []);
    const pending = merged.items.filter((i) => i.status === "pending");
    expect(
      pending.reduce((s, i) => s + i.quantity, 0),
    ).toBe(10);
    expect(merged.items.find((i) => i.serveTiming === "with_meal")?.quantity).toBe(
      1,
    );
    expect(
      merged.items.find(
        (i) => i.serveTiming !== "with_meal" && i.productId === "p-drink",
      )?.quantity,
    ).toBe(9);
  });
});

describe("reconcile pending comida moves", () => {
  it("keeps optimistic split when server is one move behind", () => {
    const barCatalog: CatalogSnapshot = {
      categories: [
        {
          id: "cat-bar",
          restaurantId: "r1",
          name: "Cócteles",
          sortOrder: 0,
          isActive: true,
          preparationStation: "bar",
        },
      ],
      modifiers: [],
      products: [catalog.products.find((p) => p.id === "p-drink")!],
    };
    const server = applyOptimisticQuantityDelta(
      emptyOrder,
      barCatalog,
      "p-drink",
      10,
      "immediate",
    );
    const merged = reconcileOrderAfterServer(
      server,
      barCatalog,
      [],
      [{ productId: "p-drink", count: 3 }],
    );
    const immediate = merged.items.find(
      (i) => i.productId === "p-drink" && i.serveTiming !== "with_meal",
    );
    const comida = merged.items.find((i) => i.serveTiming === "with_meal");
    expect(immediate?.quantity).toBe(7);
    expect(comida?.quantity).toBe(3);
  });
});

describe("remove order line", () => {
  it("removes the targeted line by id", () => {
    const once = applyOptimisticQuantityDelta(emptyOrder, catalog, "p1", 1);
    const lineId = once.items[0]!.id;
    const removed = applyOptimisticRemoveOrderLine(once, lineId);
    expect(removed.items).toHaveLength(0);
  });
});

describe("move to comida optimistic", () => {
  it("moves one unit from qty 10", () => {
    const barCatalog: CatalogSnapshot = {
      categories: [
        {
          id: "cat-bar",
          restaurantId: "r1",
          name: "Cócteles",
          sortOrder: 0,
          isActive: true,
          preparationStation: "bar",
        },
      ],
      modifiers: [],
      products: [catalog.products.find((p) => p.id === "p-drink")!],
    };
    let order = applyOptimisticQuantityDelta(
      emptyOrder,
      barCatalog,
      "p-drink",
      10,
      "immediate",
    );
    const line = order.items[0]!;
    order = applyOptimisticMoveBarUnitToWithMeal(order, line.id, barCatalog);
    const enseguida = order.items.find((i) => i.serveTiming !== "with_meal");
    const comida = order.items.find((i) => i.serveTiming === "with_meal");
    expect(enseguida?.quantity).toBe(9);
    expect(comida?.quantity).toBe(1);
  });
});
