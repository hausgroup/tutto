import { describe, expect, it } from "vitest";
import {
  aggregateRestaurantReports,
  buildMonthHeatmap,
  salesIntensity,
} from "@/lib/orders/reports";
import type { Order, Payment } from "@/lib/orders/types";

function makeOrder(
  partial: Partial<Order> &
    Pick<Order, "id" | "closedAt" | "totalMinor" | "items">,
): Order {
  return {
    restaurantId: "r1",
    tableId: null,
    tableLabel: null,
    orderNumber: 1,
    status: "completed",
    subtotalMinor: partial.totalMinor,
    taxMinor: 0,
    discountMinor: 0,
    notes: null,
    openedAt: partial.closedAt!.replace(/:\d{2}:\d{2}/, ":00:00"),
    ...partial,
  };
}

describe("salesIntensity", () => {
  it("maps ratios into github-like levels", () => {
    expect(salesIntensity(0, 100)).toBe(0);
    expect(salesIntensity(10, 100)).toBe(1);
    expect(salesIntensity(40, 100)).toBe(2);
    expect(salesIntensity(70, 100)).toBe(3);
    expect(salesIntensity(100, 100)).toBe(4);
  });
});

describe("buildMonthHeatmap", () => {
  it("builds a full-week grid for the month", () => {
    const totals = new Map([
      ["2026-09-01", { grossSalesMinor: 10000, orderCount: 1 }],
      ["2026-09-15", { grossSalesMinor: 50000, orderCount: 3 }],
    ]);
    const cells = buildMonthHeatmap(totals, "2026-09");
    expect(cells.length % 7).toBe(0);
    const day15 = cells.find((c) => c.date === "2026-09-15");
    expect(day15?.intensity).toBe(4);
    const day1 = cells.find((c) => c.date === "2026-09-01");
    expect(day1?.intensity).toBe(1);
  });
});

describe("aggregateRestaurantReports", () => {
  it("ranks best and worst sellers and fills operational KPIs", () => {
    const orders: Order[] = [
      makeOrder({
        id: "o1",
        closedAt: "2026-09-10T13:30:00.000-05:00",
        openedAt: "2026-09-10T12:50:00.000-05:00",
        totalMinor: 40000,
        items: [
          {
            id: "i1",
            orderId: "o1",
            productId: "burger",
            productName: "Classic Burger",
            quantity: 2,
            unitPriceMinor: 20000,
            taxRateBps: 0,
            lineSubtotalMinor: 40000,
            lineTaxMinor: 0,
            lineTotalMinor: 40000,
            status: "delivered",
            preparationStation: "kitchen",
            notes: null,
            serveTiming: null,
            modifiers: [],
          },
        ],
      }),
      makeOrder({
        id: "o2",
        closedAt: "2026-09-11T20:10:00.000-05:00",
        openedAt: "2026-09-11T19:40:00.000-05:00",
        totalMinor: 12000,
        items: [
          {
            id: "i2",
            orderId: "o2",
            productId: "beer",
            productName: "Cerveza",
            quantity: 1,
            unitPriceMinor: 12000,
            taxRateBps: 0,
            lineSubtotalMinor: 12000,
            lineTaxMinor: 0,
            lineTotalMinor: 12000,
            status: "delivered",
            preparationStation: "bar",
            notes: null,
            serveTiming: null,
            modifiers: [],
          },
        ],
      }),
      makeOrder({
        id: "o3",
        closedAt: "2026-09-12T12:10:00.000-05:00",
        openedAt: "2026-09-12T11:50:00.000-05:00",
        totalMinor: 6000,
        items: [
          {
            id: "i3",
            orderId: "o3",
            productId: "coffee",
            productName: "Café",
            quantity: 1,
            unitPriceMinor: 6000,
            taxRateBps: 0,
            lineSubtotalMinor: 6000,
            lineTaxMinor: 0,
            lineTotalMinor: 6000,
            status: "delivered",
            preparationStation: "bar",
            notes: null,
            serveTiming: null,
            modifiers: [],
          },
        ],
      }),
    ];

    const payments: Payment[] = [
      {
        id: "p1",
        restaurantId: "r1",
        orderId: "o1",
        methodCode: "card",
        amountMinor: 40000,
        status: "completed",
        createdAt: orders[0].closedAt!,
      },
      {
        id: "p2",
        restaurantId: "r1",
        orderId: "o2",
        methodCode: "cash",
        amountMinor: 12000,
        status: "completed",
        createdAt: orders[1].closedAt!,
      },
      {
        id: "p3",
        restaurantId: "r1",
        orderId: "o3",
        methodCode: "transfer",
        amountMinor: 6000,
        status: "completed",
        createdAt: orders[2].closedAt!,
      },
    ];

    const report = aggregateRestaurantReports({
      orders,
      payments,
      yearMonth: "2026-09",
      productLimit: 2,
    });

    expect(report.orderCount).toBe(3);
    expect(report.grossSalesMinor).toBe(58000);
    expect(report.bestSellers[0]?.productId).toBe("burger");
    expect(report.worstSellers.map((p) => p.productId)).toContain("coffee");
    expect(report.worstSellers.map((p) => p.productId)).not.toContain("burger");
    expect(report.peakHour).toBe(13);
    expect(report.averageItemsPerOrder).toBeCloseTo(1.3, 1);
    expect(report.averageServiceMinutes).toBeGreaterThan(0);
    expect(report.salesByStation.some((s) => s.station === "kitchen")).toBe(
      true,
    );
    expect(report.dailyHeatmap.some((c) => c.date === "2026-09-10")).toBe(true);
  });
});
